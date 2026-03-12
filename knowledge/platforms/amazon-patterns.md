# Amazon SP-API Integration Patterns

> Patterns for integrating with Amazon Selling Partner API (SP-API). Covers dual authentication, core APIs, FBA vs FBM, throttling, and best practices.

---

## 1. Authentication — IAM + LWA Dual Auth

### 1.1 Overview

Amazon SP-API requires **two layers** of authentication:

1. **Login with Amazon (LWA)** — OAuth2 for seller authorization
2. **AWS IAM** — Signs every API request with AWS Signature v4

### 1.2 LWA OAuth2 Flow

```
1. Register as a developer in Amazon Seller Central
2. Create an LWA application → get client_id + client_secret
3. Redirect seller to consent:
   https://sellercentral.amazon.com/apps/authorize/consent?
     application_id={APP_ID}&state={CSRF_TOKEN}&version=beta

4. Seller approves → callback with ?spapi_oauth_code=xxx

5. Exchange code for tokens:
   POST https://api.amazon.com/auth/o2/token
   Body: grant_type=authorization_code&code=xxx&client_id=...&client_secret=...

6. Response: { access_token, refresh_token, expires_in: 3600 }
```

### 1.3 AWS IAM Setup

```
1. Create IAM user or role for SP-API
2. Attach AmazonSellingPartnerAPIRole policy
3. Get Access Key ID + Secret Access Key
4. Every API request must be signed with AWS Signature v4
   - Region: us-east-1 (for NA), eu-west-1 (for EU), us-west-2 (for FE)
   - Service: execute-api
```

### 1.4 Token Management

```typescript
// Access token expires in 1 hour
// Refresh token does not expire (but can be revoked)
// Always use the refresh token to get a new access token
async function getAccessToken(store: Store): Promise<string> {
  if (store.tokenExpiresAt > Date.now() + 5 * 60 * 1000) {
    return store.accessToken;
  }
  const response = await lwaClient.refreshToken(store.refreshToken);
  await updateStoreToken(store.id, response);
  return response.access_token;
}
```

---

## 2. Core APIs

### 2.1 API Overview

| API | Purpose | Mode |
|-----|---------|------|
| **Catalog Items** | Product search & details | PASSTHROUGH |
| **Listings Items** | Create/update product listings | PASSTHROUGH |
| **Orders** | Order retrieval & management | SYNC |
| **Finances** | Financial events & transactions | SYNC |
| **FBA Inventory** | Fulfillment inventory levels | SYNC |
| **FBA Inbound** | Inbound shipment planning | PASSTHROUGH |
| **Feeds** | Bulk operations (async) | PASSTHROUGH |
| **Reports** | Generate & download reports | PASSTHROUGH |
| **Notifications** | Webhook subscriptions | WEBHOOK |

### 2.2 Orders API

```
GET /orders/v0/orders?CreatedAfter=...&MarketplaceIds=... → Order list
GET /orders/v0/orders/{orderId}                            → Order detail
GET /orders/v0/orders/{orderId}/orderItems                 → Order items
POST /orders/v0/orders/{orderId}/shipmentConfirmation      → Confirm shipment
```

### 2.3 Finances API

```
GET /finances/v0/financialEvents?PostedAfter=... → Financial events
GET /finances/v0/financialEventGroups             → Financial event groups
```

### 2.4 Catalog Items

```
GET /catalog/2022-04-01/items?keywords=...&marketplaceIds=... → Search
GET /catalog/2022-04-01/items/{asin}                           → Item details
```

### 2.5 Reports API (for bulk data)

```
POST /reports/2021-06-30/reports                  → Create report request
GET  /reports/2021-06-30/reports/{reportId}        → Check report status
GET  /reports/2021-06-30/documents/{documentId}    → Download report
```

Common reports: `GET_FLAT_FILE_ORDERS_DATA`, `GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE`

---

## 3. FBA vs FBM

### 3.1 Key Differences

| Aspect | FBA (Fulfilled by Amazon) | FBM (Fulfilled by Merchant) |
|--------|--------------------------|---------------------------|
| Fulfillment | Amazon warehouses | Seller ships directly |
| `fulfillmentChannel` | `AFN` | `MFN` |
| Shipping responsibility | Amazon | Seller |
| Inventory management | Send to Amazon FC | Own warehouse |
| ERP shipping actions | **None** (Amazon handles) | Full shipping workflow |
| Returns | Amazon processes | Seller processes |
| Prime eligibility | Automatic | Seller Fulfilled Prime (qualified) |

### 3.2 ERP Impact

```typescript
function shouldHandleShipping(order: AmazonOrder): boolean {
  return order.fulfillmentChannel === 'MFN'; // Only FBM orders need shipping
}
```

For FBA orders, the ERP should:
- Track inventory sent to Amazon (FBA Inbound)
- Monitor FBA inventory levels (FBA Inventory API)
- Record FBA fulfillment fees in accounting
- But NOT generate shipping labels or upload tracking

### 3.3 FBA Inventory Sync

```
GET /fba/inventory/v1/summaries?
  granularityType=Marketplace&
  granularityId={MARKETPLACE_ID}&
  marketplaceIds={MARKETPLACE_ID}
```

Track: `fulfillableQuantity`, `inboundWorkingQuantity`, `inboundShippedQuantity`, `reservedQuantity`

---

## 4. Throttling — Token Bucket

### 4.1 Model

Amazon uses a **token bucket** rate limiting model:
- Each API has a `rate` (requests/second) and `burst` (max tokens)
- Tokens refill at `rate` per second
- Each request consumes 1 token
- If no tokens available → 429 Too Many Requests

### 4.2 Key Limits

| API | Rate | Burst |
|-----|------|-------|
| Orders.getOrders | 0.0167 (1/min) | 20 |
| Orders.getOrder | 0.5 | 30 |
| Catalog.searchCatalogItems | 2 | 2 |
| Finances.listFinancialEvents | 0.5 | 30 |
| Reports.createReport | 0.0167 | 15 |

### 4.3 Implementation

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly rate: number,    // tokens per second
    private readonly burst: number,   // max tokens
  ) {
    this.tokens = burst;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait for next token
    const waitMs = (1 / this.rate) * 1000;
    await sleep(waitMs);
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }
}
```

---

## 5. Known Quirks

### 5.1 Critical

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `amz-dual-auth` | Both LWA + AWS Sig v4 required per request | Complex auth setup | Use `@sp-api-sdk` or similar library |
| `amz-throttle-strict` | Aggressive rate limits, especially Orders API (1/min) | Sync bottleneck | Queue requests, use Reports API for bulk data |

### 5.2 High

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `amz-region-endpoints` | Different base URLs per region (NA/EU/FE) | Wrong region = auth failure | Map marketplace to region correctly |
| `amz-restricted-data` | PII data (buyer name/address) requires Restricted Data Token | Missing buyer info | Request RDT before accessing PII fields |
| `amz-asin-vs-sku` | Amazon uses ASINs (marketplace-level), sellers use SKUs | Confusion in product mapping | Map both: ASIN for marketplace, SKU for seller |

### 5.3 Medium

| ID | Issue | Workaround |
|----|-------|------------|
| `amz-settlement-delay` | Settlement reports available 3-5 days after period close | Account for delay in reconciliation |
| `amz-order-status-many` | ~15 order status values (more than other platforms) | Comprehensive status mapping needed |
| `amz-sandbox-limited` | SP-API sandbox has very limited test data | Test against production with care |

---

## 6. Best Practices

### 6.1 Use Reports for Bulk Data

Instead of paginating through Orders API (rate limited to 1 call/minute), use Reports:

```
1. Request report: POST /reports { reportType: 'GET_FLAT_FILE_ORDERS_DATA', dataStartTime, dataEndTime }
2. Poll status until DONE
3. Download report (CSV/TSV)
4. Parse and process locally
```

This bypasses API rate limits for initial sync.

### 6.2 Notifications (Webhooks)

Amazon supports push notifications for key events:

```
Supported notification types:
- ANY_OFFER_CHANGED (pricing)
- FEED_PROCESSING_FINISHED
- ORDER_CHANGE
- REPORT_PROCESSING_FINISHED
- LISTINGS_ITEM_ISSUES_CHANGE
```

Set up SQS or EventBridge as destination. Use as primary trigger with polling as fallback.

### 6.3 Marketplace Reference

| Marketplace ID | Country | Region | Currency |
|---------------|---------|--------|----------|
| `ATVPDKIKX0DER` | US | NA | USD |
| `A2EUQ1WTGCTBG2` | Canada | NA | CAD |
| `A1AM78C64UM0Y8` | Mexico | NA | MXN |
| `A1PA6795UKMFR9` | Germany | EU | EUR |
| `A1F83G8C2ARO7P` | UK | EU | GBP |
| `A13V1IB3VIYZZH` | France | EU | EUR |
| `APJ6JRA9NG5V4` | Italy | EU | EUR |
| `A1RKKUPIHCS9HS` | Spain | EU | EUR |
| `A39IBJ37TRP1C6` | Australia | FE | AUD |
| `A1VC38T7YXB528` | Japan | FE | JPY |

### 6.4 Region Endpoint Mapping

| Region | Base URL |
|--------|---------|
| North America | `https://sellingpartnerapi-na.amazon.com` |
| Europe | `https://sellingpartnerapi-eu.amazon.com` |
| Far East | `https://sellingpartnerapi-fe.amazon.com` |
