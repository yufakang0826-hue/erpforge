# eBay Integration Patterns

> Distilled from production eBay integration using `ebay-api` (hendt) SDK. Covers OAuth, core APIs, field mapping, known quirks, and best practices.

---

## 1. Authentication — OAuth2 Authorization Code Grant

### 1.1 Flow

```
1. Redirect seller to eBay consent page:
   https://auth.ebay.com/oauth2/authorize?
     client_id={APP_ID}&
     redirect_uri={RU_NAME}&
     response_type=code&
     scope={SCOPES}&
     state={CSRF_TOKEN}

2. Seller approves → eBay redirects to your callback with ?code=xxx

3. Exchange code for tokens:
   POST https://api.ebay.com/identity/v1/oauth2/token
   Body: grant_type=authorization_code&code=xxx&redirect_uri={RU_NAME}
   Auth: Basic base64(client_id:client_secret)

4. Response: { access_token, refresh_token, expires_in }

5. Store tokens per-store (each eBay store has independent tokens)
```

### 1.2 Token Refresh

```typescript
// Access token expires in 2 hours, refresh token in 18 months
// Always refresh proactively (5 min before expiry), not reactively
async function ensureFreshToken(store: Store): Promise<string> {
  if (store.tokenExpiresAt > Date.now() + 5 * 60 * 1000) {
    return store.accessToken;
  }
  const newToken = await refreshAccessToken(store.refreshToken);
  await updateStoreToken(store.id, newToken);
  return newToken.access_token;
}
```

### 1.3 Required Scopes

```
https://api.ebay.com/oauth/api_scope
https://api.ebay.com/oauth/api_scope/sell.inventory
https://api.ebay.com/oauth/api_scope/sell.fulfillment
https://api.ebay.com/oauth/api_scope/sell.finances
https://api.ebay.com/oauth/api_scope/sell.marketing
https://api.ebay.com/oauth/api_scope/commerce.taxonomy.readonly
```

---

## 2. Core APIs

### 2.1 API Overview

| API | Version | Purpose | Mode |
|-----|---------|---------|------|
| **Inventory API** | v1 | Product listing management | SYNC/PASSTHROUGH |
| **Fulfillment API** | v1 | Order management | SYNC |
| **Finances API** | v1 | Transactions & payouts | SYNC |
| **Post-Order API** | v2 | Returns, cancellations | SYNC |
| **Commerce Taxonomy** | v1 | Categories & attributes | PASSTHROUGH (cached) |
| **Analytics API** | v1 | Traffic & sales reports | PASSTHROUGH |
| **Marketing API** | v1 | Promoted listings | PASSTHROUGH |

### 2.2 Inventory API — Product Publishing

Three-step publishing flow:

```
1. Create/Update InventoryItem (SKU-based)
   PUT /sell/inventory/v1/inventory_item/{sku}

2. Create Offer (binds SKU to marketplace + policies)
   POST /sell/inventory/v1/offer

3. Publish Offer → creates live eBay listing
   POST /sell/inventory/v1/offer/{offerId}/publish
```

For multi-variation products:
```
1. Create InventoryItem for EACH variant SKU
2. Create InventoryItemGroup (parent) linking all variant SKUs
   PUT /sell/inventory/v1/inventory_item_group/{groupKey}
3. Create Offer for the group
4. Publish
```

**Critical rule**: In InventoryItemGroup, `aspects` (shared attributes) and `variesBy.aspectsImageVariesBy` must be **mutually exclusive**. No attribute can appear in both.

### 2.3 Fulfillment API — Orders

```
GET  /sell/fulfillment/v1/order?filter=...        → Order list (paginated)
GET  /sell/fulfillment/v1/order/{orderId}          → Order detail
POST /sell/fulfillment/v1/order/{orderId}/shipping_fulfillment → Create shipment
GET  /sell/fulfillment/v1/order/{orderId}/shipping_fulfillment → List shipments
POST /sell/fulfillment/v1/order/{orderId}/issue_refund         → Issue refund
```

### 2.4 Finances API — Transactions & Payouts

```
GET /sell/finances/v1/transaction?filter=...       → Transaction list
GET /sell/finances/v1/payout?filter=...            → Payout list
GET /sell/finances/v1/transaction_summary?filter=... → Summary (live)
GET /sell/finances/v1/seller_funds_summary          → Fund balance (live)
```

### 2.5 Post-Order API — Returns & Cancellations

```
GET /post-order/v2/return/search                   → Return list
GET /post-order/v2/return/{returnId}               → Return detail
POST /post-order/v2/return/{returnId}/issue_refund → Issue return refund
POST /post-order/v2/cancellation/{legacyOrderId}/confirm → Confirm cancellation
```

**Note**: Cancellation API uses `legacyOrderId`, not the REST `orderId`. Store both.

---

## 3. Field Mapping — Key Fields

### 3.1 Order Fields

| Internal Field | eBay API Field | Notes |
|---------------|---------------|-------|
| `platformOrderId` | `orderId` | REST format: `12-34567-89012` |
| `buyerUsername` | `buyer.username` | |
| `priceSubtotal` | `pricingSummary.priceSubtotal.value` | |
| `deliveryCost` | `pricingSummary.deliveryCost.value` | |
| `taxAmount` | `pricingSummary.tax.value` | |
| `totalAmount` | `pricingSummary.total.value` | |
| `platformStatus` | `orderFulfillmentStatus` | `FULFILLED`, `NOT_STARTED`, `IN_PROGRESS` |
| `marketplaceId` | `salesRecordReference` → derive from order | Or use `X-EBAY-C-MARKETPLACE-ID` header |
| `isTaxInclusive` | Derived from marketplace | GB/AU/DE/FR/IT/ES = true; US/CA = false |

### 3.2 Transaction Fee Fields

| Internal Category | eBay Fee Type | API Field Path |
|------------------|--------------|----------------|
| `commission` | `FINAL_VALUE_FEE` | `orderLineItems[].marketplaceFees[]` |
| `advertising` | `AD_FEE` | `totalFeeBasisAmount` |
| `international` | `INTERNATIONAL_FEE` | `amount` |
| `regulatory` | `REGULATORY_OPERATING_FEE` | `amount` |
| `listing_fee` | `INSERTION_FEE` | `amount` |

**Important**: eBay uses `marketplaceFees` (not `fees`) as the field name for order-level fees.

---

## 4. Known Quirks

### 4.1 Critical

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `ebay-openssl-sign` | eBay Digital Signature requires OpenSSL `createSign` with specific headers | API calls fail with 215120 | Use `ebay-api` SDK which handles signing |
| `ebay-token-silent-expire` | Refresh token expires after 18 months with no warning | All API calls fail | Proactive monitoring + re-auth flow |
| `ebay-sandbox-diff` | Sandbox behavior differs from production (missing fields, different enums) | Tests pass in sandbox but fail in prod | Always validate against production |
| `ebay-legacy-order-id` | Cancel API requires `legacyOrderId`, not REST `orderId` | Cancellation fails | Store `legacyOrderId` from order sync |

### 4.2 High

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `ebay-error-format` | Error response format inconsistent between APIs | Error parsing breaks | Normalize error handling per API |
| `ebay-marketplace-fees-name` | Fee field is `marketplaceFees` not `fees` | Missing fee data | Use correct field name |
| `ebay-pagination-limit` | Max 200 orders per page, max 10000 total via offset | Can't sync old orders | Use date range filters to segment |
| `ebay-no-order-webhook` | No webhook for order updates | Must poll | BullMQ cron every 2h |

### 4.3 Medium

| ID | Issue | Workaround |
|----|-------|------------|
| `ebay-vat-detection` | No explicit VAT flag; must infer from marketplace | Maintain marketplace → isTaxInclusive mapping |
| `ebay-gtc-renewal` | Good 'Til Cancelled listings auto-renew | Track GTC status separately |
| `ebay-aspect-exclusion` | Group aspects and variesBy must not overlap | Validate before publish |

---

## 5. Best Practices

### 5.1 Bulk Operations

- Use **Bulk Inventory** endpoints for large catalog updates (up to 25 items per call)
- Use `X-EBAY-C-MARKETPLACE-ID` header for all marketplace-specific calls
- Batch order sync by date range, not by single order

### 5.2 Incremental Sync

```typescript
// Order sync: pull modified orders since last sync
const filter = `creationdate:[${lastSyncDate}..] OR lastmodifieddate:[${lastSyncDate}..]`;
const orders = await ebay.sell.fulfillment.getOrders({ filter, limit: 200 });
```

### 5.3 Deduplication

```
Unique key: (platform='ebay', marketplace_id, platform_order_id)
```

- Use `dataVersion` for optimistic locking during upsert
- Platform data always wins during sync (except user-modified fields)

### 5.4 Rate Limiting

eBay uses per-app and per-user rate limits. Key limits:
- Inventory API: 5 calls/second
- Fulfillment API: 5 calls/second
- Finances API: 10 calls/second

Implement exponential backoff on 429 responses.

### 5.5 Error Handling

```typescript
// eBay errors come in different shapes depending on the API
interface EbayError {
  errors: Array<{
    errorId: number;
    domain: string;
    category: string;     // REQUEST | APPLICATION | BUSINESS
    message: string;
    longMessage?: string;
    parameters?: Array<{ name: string; value: string }>;
  }>;
}
```

Key error codes to handle:
- `215120` — Digital signature required/invalid
- `25001` — Token expired
- `25004` — Invalid access token
- `25014` — Refresh token expired (re-auth needed)

---

## 6. Marketplace ID Reference

| Marketplace ID | Country | Currency | Tax Model |
|---------------|---------|----------|-----------|
| `EBAY_US` | United States | USD | Price-exclusive |
| `EBAY_GB` | United Kingdom | GBP | VAT-inclusive |
| `EBAY_DE` | Germany | EUR | VAT-inclusive |
| `EBAY_FR` | France | EUR | VAT-inclusive |
| `EBAY_IT` | Italy | EUR | VAT-inclusive |
| `EBAY_ES` | Spain | EUR | VAT-inclusive |
| `EBAY_AU` | Australia | AUD | GST-inclusive |
| `EBAY_CA` | Canada | CAD | Price-exclusive |

---

## Lessons from Production

- **OAuth tokens expire silently.** eBay sometimes returns HTTP 200 with empty data instead of a clear 401. Your token refresh logic must detect this pattern, not just check status codes.

- **Sandbox ≠ Production.** eBay sandbox API behavior diverges from production in subtle ways (different field names, missing nested objects, different error formats). Never consider a feature "tested" based on sandbox alone.

- **Bulk API operations don't report individual failures clearly.** When a bulk inventory update partially fails, the error response may only mention the first failure. Process items individually for reliable error handling, then optimize with bulk only after individual processing works perfectly.

- **GetItem/GetOrder field names differ between XML and REST APIs.** The Trading API uses `SellingStatus.CurrentPrice` while the Inventory API uses `pricingSummary.price`. Mapping between them is a constant source of bugs.

- **eBay rate limits vary by API and by time of day.** The same call that works fine at 3 AM hits rate limits at 10 AM. Implement exponential backoff with jitter, not fixed retry intervals.
