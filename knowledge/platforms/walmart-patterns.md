# Walmart Integration Patterns

> Distilled from production Walmart Marketplace integration. Covers OAuth, Feed API, Orders, Reports, known quirks, and best practices.

---

## 1. Authentication — OAuth2 Client Credentials

### 1.1 Flow

Walmart uses **Client Credentials** grant (no user consent page needed):

```
POST https://marketplace.walmartapis.com/v3/token
Headers:
  Authorization: Basic base64(client_id:client_secret)
  Content-Type: application/x-www-form-urlencoded
  WM_SVC.NAME: Walmart Marketplace
  WM_QOS.CORRELATION_ID: {uuid}
Body:
  grant_type=client_credentials

Response: { access_token, token_type: "Bearer", expires_in: 900 }
```

### 1.2 Token Management

- Access token expires in **15 minutes** (very short!)
- No refresh token; just request a new token
- Cache token and refresh 2 minutes before expiry
- Each API call requires additional Walmart-specific headers

### 1.3 Required Headers

Every API call must include:

```
WM_SEC.ACCESS_TOKEN: {token}
WM_SVC.NAME: Walmart Marketplace
WM_QOS.CORRELATION_ID: {uuid}  // unique per request
Accept: application/json
Content-Type: application/json
```

---

## 2. Feed API — Asynchronous Operations

### 2.1 Feed Pattern

Walmart uses an asynchronous **Feed** pattern for bulk operations (product creation, updates, inventory, pricing):

```
1. Submit Feed
   POST /v3/feeds?feedType={type}
   Body: { items: [...] }
   Response: { feedId: "xxx" }

2. Poll Feed Status (wait for processing)
   GET /v3/feeds/{feedId}?includeDetails=true
   Response: { feedStatus: "PROCESSED", itemsReceived: 100, itemsSucceeded: 95, ... }

3. Get Feed Errors
   GET /v3/feeds/{feedId}?includeDetails=true&offset=0&limit=50
   Response: { itemDetails: [{ itemId, martId, sku, errors: [...] }] }
```

### 2.2 Feed Types

| Feed Type | Purpose |
|-----------|---------|
| `item` | Product catalog management |
| `INVENTORY` | Inventory quantity updates |
| `price` | Price updates |
| `order` | Order acknowledgement/shipping |
| `RETURNS_OVERRIDES` | Return policy overrides |

### 2.3 Feed Processing Time

- Typical: 5-30 minutes
- Peak: up to 4 hours
- Poll interval: start at 30s, increase to 5min

---

## 3. Orders API

### 3.1 Key Endpoints

```
GET  /v3/orders?createdStartDate=...&status=...  → Order list
GET  /v3/orders/{purchaseOrderId}                  → Order detail
POST /v3/orders/{purchaseOrderId}/acknowledge      → Acknowledge order
POST /v3/orders/{purchaseOrderId}/shipping         → Ship order
POST /v3/orders/{purchaseOrderId}/cancel           → Cancel order lines
POST /v3/orders/{purchaseOrderId}/refund           → Refund order
```

### 3.2 Order Field Mapping

| Internal Field | Walmart Field | Notes |
|---------------|--------------|-------|
| `platformOrderId` | `purchaseOrderId` | Primary identifier |
| `buyerUsername` | `shippingInfo.postalAddress.name` | Walmart doesn't expose buyer username |
| `priceSubtotal` | Sum of `orderLines[].charges[type=PRODUCT].amount` | Must aggregate from line items |
| `deliveryCost` | Sum of `orderLines[].charges[type=SHIPPING].amount` | |
| `taxAmount` | Sum of `orderLines[].tax.amount` | |
| `totalAmount` | Sum of all charges + tax | |
| `platformStatus` | `status` | `Created`, `Acknowledged`, `Shipped`, `Delivered`, `Cancelled` |

### 3.3 Pagination

Walmart uses cursor-based pagination:

```typescript
let cursor: string | undefined;
do {
  const response = await walmart.getOrders({ nextCursor: cursor, limit: 200 });
  processOrders(response.list.elements.order);
  cursor = response.list.meta.nextCursor;
} while (cursor);
```

---

## 4. Settlement Reports

### 4.1 Report Types

```
GET /v3/report/reconreport/reconFile?reportDate={YYYY-MM-DD}
```

### 4.2 Response Format

Walmart returns settlement reports as **ZIP-compressed CSV** files, but:

- The response Content-Type may say `application/octet-stream`
- The raw bytes start with PK magic bytes (ZIP header)
- Must detect ZIP format by checking first 2 bytes (`0x50, 0x4B`)
- Use `zlib.inflateRawSync` to decompress (not `gunzip`, not `unzip`)

```typescript
function parseSettlementReport(buffer: Buffer): ParsedReport {
  // Check for PK magic bytes (ZIP format)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const csvContent = entries[0].getData().toString('utf8');
    return parseCSV(csvContent);
  }
  // Fallback: plain text
  return parseCSV(buffer.toString('utf8'));
}
```

---

## 5. Known Quirks

### 5.1 Critical

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `wmt-zip-report` | Settlement reports are ZIP-compressed but not documented as such | Report parsing fails | Check PK magic bytes, use AdmZip |
| `wmt-csv-columns` | CSV column names don't match API documentation | Field mapping breaks | Use actual CSV headers, not docs |
| `wmt-feed-delay` | Feed processing can take hours during peak | Inventory/price updates delayed | Submit feeds during off-peak, implement status polling |

### 5.2 High

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `wmt-token-15min` | Token expires every 15 minutes | Frequent re-auth needed | Aggressive token caching with 2-min buffer |
| `wmt-multi-market` | Canada/Mexico marketplace APIs have subtle differences | Unexpected errors | Test each marketplace independently |
| `wmt-no-buyer-info` | No buyer username in order data | Can't match buyer for blocklist | Use shipping name + address as proxy |
| `wmt-dedup-period` | Transaction IDs may repeat across settlement periods | Data overwrite | Prefix transaction ID with period for dedup |

### 5.3 Medium

| ID | Issue | Workaround |
|----|-------|------------|
| `wmt-category-small` | Category tree is small (~25 departments) | Can embed as static constants with API fallback |
| `wmt-item-spec-static` | Item attributes not available via API for all categories | Maintain static mapping from Item Spec 5.0 docs |
| `wmt-order-ack` | Orders must be acknowledged within 24h | Auto-acknowledge on sync |

---

## 6. Best Practices

### 6.1 Feed Management

- Always check feed status before assuming success
- Implement feed status polling with exponential backoff
- Log feed errors with full details for debugging
- Batch items in feeds (max 10,000 items per feed)

### 6.2 Order Sync

```
Sync strategy:
1. Pull orders by createdStartDate (incremental)
2. Cursor-based pagination (not offset)
3. Auto-acknowledge new orders on sync
4. Status mapping: Created→PENDING, Acknowledged→PAID, Shipped→SHIPPED, Delivered→DELIVERED, Cancelled→CANCELLED
```

### 6.3 Category & Attributes

For Walmart, use a hybrid approach:

```
1. Maintain STATIC_CATEGORIES constant (~25 departments × ~100 subcategories)
2. Attempt API call to get real-time categories
3. If API fails → fall back to static data
4. Show static data immediately during API loading (don't block user)
5. Attributes: static mapping per category from Item Spec 5.0 documentation
   - Include enumerated values for dropdowns
   - Mark required vs recommended vs optional
```

### 6.4 Rate Limiting

Walmart has strict rate limits:
- 20 calls/second per client ID (default)
- Higher limits available through partner programs
- 429 responses include `Retry-After` header

### 6.5 Error Handling

```typescript
interface WalmartError {
  error: Array<{
    code: string;
    field?: string;
    description: string;
    info?: string;
    severity: 'ERROR' | 'WARN';
    category: 'APPLICATION' | 'SYSTEM' | 'REQUEST';
    causes?: Array<{ code: string; field: string; description: string }>;
  }>;
}
```

---

## 7. Marketplace Reference

| Marketplace | Base URL | Currency |
|------------|---------|----------|
| US | `marketplace.walmartapis.com` | USD |
| Canada | `marketplace.walmartapis.ca` | CAD |
| Mexico | `marketplace.walmartapis.com.mx` | MXN |

---

## Lessons from Production

- **Feed processing is eventually consistent.** After submitting a feed, the status API may show "processing" for minutes to hours. Don't retry submissions during this window — you'll create duplicates.

- **Settlement reports are ZIP files, not JSON.** This catches every team that reads the docs too quickly. The financial reconciliation endpoint returns a ZIP containing CSV files, not a JSON response.

- **Multi-marketplace means multi-everything.** US, Canada, and Mexico have different category trees, different required attributes, and different fee structures. Code that works for Walmart US will NOT work for Walmart CA without changes.
