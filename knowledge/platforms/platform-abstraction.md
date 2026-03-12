# Multi-Platform Abstraction Patterns

> The most important platform knowledge file. Defines the architecture for supporting multiple e-commerce platforms (eBay, Amazon, Walmart, MercadoLibre, etc.) in a single ERP system.

---

## 1. PlatformEngine Base Class

### 1.1 Abstract Interface

```typescript
/**
 * Base class for all platform integrations.
 * Each platform implements this interface to provide a unified API surface.
 */
abstract class PlatformEngine {
  abstract readonly platform: string; // 'ebay' | 'amazon' | 'walmart' | 'mercadolibre'

  // ─── Orders ────────────────────────────────────────
  abstract syncOrders(storeId: string, since: Date): Promise<SyncResult<Order>>;
  abstract getOrder(storeId: string, platformOrderId: string): Promise<Order>;
  abstract acknowledgeOrder(storeId: string, platformOrderId: string): Promise<void>;

  // ─── Fulfillment ──────────────────────────────────
  abstract pushTracking(storeId: string, orderId: string, tracking: TrackingInfo): Promise<FulfillmentResult>;
  abstract cancelOrder(storeId: string, platformOrderId: string, reason: string): Promise<void>;
  abstract issueRefund(storeId: string, orderId: string, refund: RefundRequest): Promise<RefundResult>;

  // ─── Products ──────────────────────────────────────
  abstract syncProducts(storeId: string): Promise<SyncResult<Product>>;
  abstract publishListing(storeId: string, listing: ListingDraft): Promise<PublishResult>;
  abstract updateInventory(storeId: string, sku: string, quantity: number): Promise<void>;
  abstract updatePrice(storeId: string, sku: string, price: MoneyAmount): Promise<void>;

  // ─── Financials ────────────────────────────────────
  abstract syncTransactions(storeId: string, since: Date): Promise<SyncResult<Transaction>>;
  abstract syncPayouts(storeId: string, since: Date): Promise<SyncResult<Payout>>;

  // ─── Auth ──────────────────────────────────────────
  abstract getAuthUrl(redirectUri: string, state: string): string;
  abstract exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  abstract refreshToken(refreshToken: string): Promise<TokenSet>;

  // ─── Categories ────────────────────────────────────
  abstract getCategories(marketplaceId: string, parentId?: string): Promise<Category[]>;
  abstract getCategoryAttributes(marketplaceId: string, categoryId: string): Promise<Attribute[]>;
}

// ─── Common Types ─────────────────────────────────────

interface SyncResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  cursor?: string;
  syncedAt: Date;
}

interface TrackingInfo {
  trackingNumber: string;
  carrierCode: string;
  shippedDate?: Date;
  lineItems?: string[]; // for partial shipment
}

interface MoneyAmount {
  amount: number;
  currency: string;
}

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: Date;
}
```

### 1.2 Platform Registry

```typescript
class PlatformRegistry {
  private engines = new Map<string, PlatformEngine>();

  register(engine: PlatformEngine): void {
    this.engines.set(engine.platform, engine);
  }

  get(platform: string): PlatformEngine {
    const engine = this.engines.get(platform);
    if (!engine) throw new Error(`Platform engine not found: ${platform}`);
    return engine;
  }

  list(): string[] {
    return Array.from(this.engines.keys());
  }
}

// Usage
const registry = new PlatformRegistry();
registry.register(new EbayEngine());
registry.register(new WalmartEngine());
registry.register(new AmazonEngine());
registry.register(new MeliEngine());

// In sync worker:
const engine = registry.get(store.platform);
const orders = await engine.syncOrders(store.id, lastSyncDate);
```

---

## 2. Unified Table vs Platform-Separated Tables

### 2.1 Recommendation: Unified Table + rawData JSONB

**Unified table** (recommended for most cases):

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  platform_order_id VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL,       -- ebay | walmart | amazon | mercadolibre
  marketplace_id VARCHAR(20) NOT NULL,
  store_id UUID NOT NULL,
  -- ... common fields ...
  raw_data JSONB,                      -- original platform response (full fidelity)
  UNIQUE(platform, marketplace_id, platform_order_id)
);
```

**Why unified?**
- Cross-platform queries (sort all orders by date, regardless of platform)
- Single reporting pipeline
- Simpler code (one service, one route, one UI)
- `rawData` JSONB preserves platform-specific fields without schema changes

**When to separate?**
- Only if platforms have fundamentally different data models (rare)
- Or for very high-volume scenarios where index size matters

### 2.2 Field Normalization Strategy

```typescript
// Each platform engine normalizes its data to the common schema
interface OrderNormalizer {
  normalizeOrder(rawOrder: unknown, platform: string): NormalizedOrder;
  normalizeOrderItem(rawItem: unknown, platform: string): NormalizedOrderItem;
  normalizeStatus(platformStatus: string, platform: string): NormalizedStatus;
}

// Status normalization map
const STATUS_MAPS: Record<string, Record<string, NormalizedStatus>> = {
  ebay: {
    'NOT_STARTED': 'PENDING',
    'IN_PROGRESS': 'PAID',
    'FULFILLED': 'SHIPPED',
  },
  walmart: {
    'Created': 'PENDING',
    'Acknowledged': 'PAID',
    'Shipped': 'SHIPPED',
    'Delivered': 'DELIVERED',
    'Cancelled': 'CANCELLED',
  },
  amazon: {
    'Pending': 'PENDING',
    'Unshipped': 'PAID',
    'Shipped': 'SHIPPED',
    'Canceled': 'CANCELLED',
  },
  mercadolibre: {
    'confirmed': 'PENDING',
    'paid': 'PAID',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
  },
};
```

---

## 3. Field Mapping Strategy

### 3.1 Configuration-Driven Mapping

Use YAML configuration files to define field mappings per platform:

```yaml
# field-mappings/ebay.yaml
platform: ebay
order:
  platform_order_id: orderId
  buyer_username: buyer.username
  price_subtotal: pricingSummary.priceSubtotal.value
  price_subtotal_currency: pricingSummary.priceSubtotal.currency
  delivery_cost: pricingSummary.deliveryCost.value
  tax_amount: pricingSummary.tax.value
  total_amount: pricingSummary.total.value
  total_amount_currency: pricingSummary.total.currency
  platform_status: orderFulfillmentStatus
  platform_created_at: creationDate

order_item:
  platform_line_item_id: lineItemId
  sku: sku
  title: title
  quantity: quantity
  line_item_cost: lineItemCost.value
  total: total.value
```

### 3.2 Field Mapper Implementation

```typescript
class FieldMapper {
  constructor(private readonly mapping: Record<string, string>) {}

  map(source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [targetField, sourcePath] of Object.entries(this.mapping)) {
      result[targetField] = getNestedValue(source, sourcePath);
    }
    return result;
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}
```

---

## 4. Error Handling Standardization

### 4.1 Unified Error Interface

```typescript
interface PlatformError {
  code: string;              // Internal error code: PLATFORM_AUTH_EXPIRED, PLATFORM_RATE_LIMIT, etc.
  platform: string;          // ebay | walmart | amazon | mercadolibre
  httpStatus?: number;
  originalError: unknown;    // Raw platform error
  message: string;           // Human-readable message
  retryable: boolean;        // Can this be retried?
  retryAfterMs?: number;     // Suggested retry delay
}
```

### 4.2 Error Code Mapping

```typescript
const ERROR_MAP: Record<string, (raw: unknown) => PlatformError> = {
  ebay: (raw) => {
    const err = raw as EbayErrorResponse;
    const code = err.errors?.[0]?.errorId;
    if (code === 25001 || code === 25004) return { code: 'AUTH_EXPIRED', retryable: false, ... };
    if (code === 25014) return { code: 'REFRESH_TOKEN_EXPIRED', retryable: false, ... };
    return { code: 'PLATFORM_ERROR', retryable: true, ... };
  },
  walmart: (raw) => {
    const err = raw as WalmartErrorResponse;
    if (err.error?.[0]?.code === 'UNAUTHORIZED') return { code: 'AUTH_EXPIRED', retryable: false, ... };
    return { code: 'PLATFORM_ERROR', retryable: true, ... };
  },
  // ... similar for amazon, mercadolibre
};
```

---

## 5. Sync Strategy

### 5.1 Three Sync Modes

| Mode | Mechanism | When |
|------|-----------|------|
| **Webhook** (real-time) | Platform pushes events to your endpoint | Preferred when available (Amazon Notifications, Walmart Webhooks) |
| **Polling** (scheduled) | BullMQ cron job pulls data at intervals | Default for all platforms (every 2h for orders, 6h for transactions) |
| **Manual Trigger** | User clicks "Sync Now" button | On-demand, for debugging or initial setup |

### 5.2 Sync Architecture

```
                    ┌─────────────────────────┐
                    │    Platform Webhooks     │ (if available)
                    └───────────┬─────────────┘
                                ↓
┌──────────────┐    ┌─────────────────────────┐
│ BullMQ Cron  │───→│     Sync Worker          │
│ (every 2h)   │    │                         │
└──────────────┘    │ 1. Get store credentials │
                    │ 2. Call platform engine   │
┌──────────────┐    │ 3. Transform & normalize │
│ Manual Sync  │───→│ 4. Upsert to database    │
│ (user click) │    │ 5. Handle conflicts      │
└──────────────┘    └─────────────────────────┘
```

### 5.3 Conflict Resolution

```
Rule: Platform data ALWAYS wins during sync (source of truth).
Exception: User-modified fields (internal_status, notes, tags) are NEVER overwritten.

Implementation:
  INSERT INTO orders (...) VALUES (...)
  ON CONFLICT (platform, marketplace_id, platform_order_id) DO UPDATE SET
    -- Platform fields: always overwrite
    platform_status = EXCLUDED.platform_status,
    total_amount = EXCLUDED.total_amount,
    fulfillment_status = EXCLUDED.fulfillment_status,
    raw_data = EXCLUDED.raw_data,
    data_version = orders.data_version + 1,
    synced_at = now(),
    -- Internal fields: NEVER overwrite
    -- internal_status, notes, tags are NOT in this UPDATE list
```

---

## 6. Store Management

### 6.1 Multi-Store Architecture

Each store has independent credentials and can be on the same platform:

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,          -- "eBay US Main Store"
  platform VARCHAR(20) NOT NULL,       -- ebay | walmart | amazon | mercadolibre
  marketplace_id VARCHAR(20) NOT NULL, -- EBAY_US | walmart_us | ATVPDKIKX0DER | MLM
  site_id VARCHAR(10),                 -- platform-specific site code

  -- OAuth credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Platform-specific identifiers
  platform_seller_id VARCHAR(100),     -- eBay: userId, Amazon: sellerId
  platform_account_id VARCHAR(100),

  -- Sync state
  last_order_sync_at TIMESTAMPTZ,
  last_product_sync_at TIMESTAMPTZ,
  last_finance_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,

  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | disconnected | error
  status_message TEXT,                 -- Error details if status = 'error'

  UNIQUE(tenant_id, platform, marketplace_id, platform_seller_id)
);
```

### 6.2 Multi-Store of Same Platform

A seller may have multiple stores on the same platform:
- `eBay US Store A` and `eBay US Store B` (different eBay accounts)
- Each has independent OAuth tokens
- The ERP must handle this gracefully in sync scheduling (don't sync both simultaneously)

---

## 7. Platform Configuration

### 7.1 Platform Config Structure

```yaml
# platform-config/ebay.yaml
platform: ebay
displayName: eBay
icon: ebay-icon
authType: authorization_code
authUrl: https://auth.ebay.com/oauth2/authorize
tokenUrl: https://api.ebay.com/identity/v1/oauth2/token
scopes:
  - https://api.ebay.com/oauth/api_scope
  - https://api.ebay.com/oauth/api_scope/sell.inventory
  - https://api.ebay.com/oauth/api_scope/sell.fulfillment
  - https://api.ebay.com/oauth/api_scope/sell.finances
marketplaces:
  - id: EBAY_US
    name: United States
    currency: USD
    language: en
    taxModel: exclusive
  - id: EBAY_GB
    name: United Kingdom
    currency: GBP
    language: en
    taxModel: inclusive
  # ... more marketplaces
syncIntervals:
  orders: 7200       # 2 hours
  transactions: 21600 # 6 hours
  payouts: 43200     # 12 hours
rateLimits:
  default: 5         # requests per second
  fulfillment: 5
  finances: 10
```

---

## 8. Fee Normalization

### 8.1 Unified Fee Categories

Every platform's fee types map to a unified set:

```typescript
type FeeCategory =
  | 'listing_fee'
  | 'commission'
  | 'payment_processing'
  | 'advertising'
  | 'fulfillment'
  | 'storage'
  | 'shipping_label'
  | 'international'
  | 'regulatory'
  | 'subscription'
  | 'return_fee'
  | 'other';

// Each platform engine maintains its own mapping
const EBAY_FEE_MAP: Record<string, FeeCategory> = {
  'FINAL_VALUE_FEE': 'commission',
  'INSERTION_FEE': 'listing_fee',
  'AD_FEE': 'advertising',
  'INTERNATIONAL_FEE': 'international',
  'REGULATORY_OPERATING_FEE': 'regulatory',
};
```

---

## 9. New Platform Integration Checklist

```
[ ] 1. Implement PlatformEngine subclass with all abstract methods
[ ] 2. Create OAuth flow (auth URL generation, code exchange, token refresh)
[ ] 3. Create API client with retry + circuit breaker + rate limiting
[ ] 4. Create field mapping configuration (YAML)
[ ] 5. Create status normalization mapping
[ ] 6. Create fee type normalization mapping
[ ] 7. Register engine in PlatformRegistry
[ ] 8. Add sync worker support for the new platform
[ ] 9. Add BullMQ cron job for scheduled sync
[ ] 10. Add platform config YAML (marketplaces, rate limits, sync intervals)
[ ] 11. Frontend: Add platform tab in order/product/listing pages
[ ] 12. Frontend: Add store connection flow for the new platform
[ ] 13. Test: OAuth flow end-to-end
[ ] 14. Test: Order sync + dedup + conflict resolution
[ ] 15. Test: Tracking upload + fulfillment
[ ] 16. Test: Transaction sync + fee normalization
[ ] 17. Document quirks in knowledge/platforms/{platform}-patterns.md
```
