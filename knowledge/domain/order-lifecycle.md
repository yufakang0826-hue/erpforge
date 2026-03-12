# Order Lifecycle — Cross-Platform Pattern

> Distilled from production cross-border e-commerce ERP handling eBay, Walmart, Amazon, and MercadoLibre orders.

---

## 1. Order State Machine

### 1.1 Internal Status (Recommended 11 States)

```
pending_review → approved → processing → ready_to_ship → shipped → delivered → completed
                                                                                    ↗
                         (any state) → cancelled
                         (shipped+)  → refunded
                         (any state) → on_hold ──(resolved)──→ (previous state)
```

| Status | Description | Typical Trigger |
|--------|-------------|-----------------|
| `pending_review` | Newly synced, awaiting auto/manual review | Order sync from platform |
| `approved` | Passed review rules, ready for processing | Auto-review engine or manual approval |
| `processing` | Being picked/packed or purchasing from supplier | Warehouse assignment or purchase order created |
| `ready_to_ship` | Label printed, awaiting carrier pickup | Label generation complete |
| `shipped` | Tracking number uploaded to platform | Carrier API confirmation |
| `delivered` | Carrier confirmed delivery | Tracking event update |
| `completed` | Order lifecycle complete, no pending actions | Delivery + settlement confirmed |
| `cancelled` | Cancelled before shipment | Buyer/seller cancellation |
| `refunded` | Full or partial refund issued after shipment | Return/refund request processed |
| `on_hold` | Paused due to one or more holds (see Hold System) | Review rule or manual hold |

### 1.2 Legal State Transitions

```yaml
transitions:
  pending_review: [approved, on_hold, cancelled]
  approved: [processing, on_hold, cancelled]
  processing: [ready_to_ship, on_hold, cancelled]
  ready_to_ship: [shipped, on_hold, cancelled]
  shipped: [delivered, refunded]
  delivered: [completed, refunded]
  completed: [refunded]  # post-completion refund
  on_hold: [pending_review, approved, processing, ready_to_ship, cancelled]
  cancelled: []  # terminal
  refunded: []   # terminal
```

### 1.3 Multi-Dimensional Status Lines

Beyond the primary `internalStatus`, a production ERP typically tracks parallel status dimensions:

| Dimension | Field | Values | Purpose |
|-----------|-------|--------|---------|
| Platform status | `platformStatus` | Raw platform value | Audit trail |
| Normalized status | `status` | `PENDING/PAID/SHIPPED/DELIVERED/COMPLETED/CANCELLED/REFUNDED` | Cross-platform reporting |
| Payment | `paymentStatus` | `pending/paid/partially_paid/refunded` | Financial tracking |
| Fulfillment | `fulfillmentStatus` | `unfulfilled/partially_fulfilled/fulfilled` | Warehouse ops |
| Warehouse | `warehouseStatus` | `none/allocated/picking/packed/shipped` | WMS integration |
| After-sale | `aftersaleStatus` | `none/return_requested/returning/returned/dispute` | Customer service |
| Settlement | `settlementStatus` | `unmatched/partial/matched` | Finance reconciliation |

---

## 2. Hold System

### 2.1 Typed Holds with Co-existence

Multiple holds can exist simultaneously on a single order. All must be resolved before the order can advance.

```typescript
interface OrderHold {
  id: string;
  orderId: string;
  holdType: HoldType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;
}

type HoldType =
  | 'address_hold'      // Invalid/incomplete shipping address
  | 'payment_hold'      // Payment verification pending
  | 'fraud_hold'        // Fraud risk detected
  | 'stock_hold'        // Insufficient inventory
  | 'price_hold'        // Price anomaly detected (too low margin or loss)
  | 'buyer_hold'        // Buyer on blocklist or high-risk
  | 'customs_hold'      // Export/import restriction
  | 'manual_hold';      // Manually placed by operator
```

### 2.2 Hold Resolution Flow

```
Order in state X → Hold created → Order moves to on_hold
                                        ↓
                              All holds resolved?
                              ├── No  → Stay on_hold
                              └── Yes → Return to state X (or next valid state)
```

---

## 3. Three Fulfillment Modes

| Mode | Code | Description | When to Use |
|------|------|-------------|-------------|
| Self-fulfillment | `self` | Pick, pack, ship from own warehouse | Default for most sellers |
| Supplier dropship | `supplier_dropship` | Supplier ships directly to buyer | High-value or bulky items |
| Overseas warehouse | `overseas_warehouse` | Ship from pre-stocked overseas warehouse | Fast delivery for target market |

Each mode affects:
- **Inventory deduction**: Self = deduct from own stock; Dropship = create purchase order; Overseas = deduct from overseas stock
- **Shipping label**: Self = generate from carrier API; Dropship = supplier provides; Overseas = warehouse generates
- **Tracking upload**: All modes must upload tracking to the selling platform

---

## 4. Dual Routing Engine

### 4.1 Fulfillment Routing (SKU → Warehouse/Supplier)

Determines HOW an order gets fulfilled:

```
Input:  SKU + destination country + order value + platform
        ↓
Rules:  Priority-ordered conditions (JSON):
        - sku_pattern matches "OW-*" → overseas_warehouse
        - destination_country IN ['US','CA'] AND weight < 2000g → self
        - supplier_id = 'xxx' → supplier_dropship
        ↓
Output: fulfillmentType + warehouseId/supplierId
```

### 4.2 Shipping Routing (Order → Carrier + Channel)

Determines WHICH carrier and channel to use:

```
Input:  destination_country × package_weight × dimensions × order_value × platform × SLA
        ↓
Rules:  Priority-ordered conditions:
        - country = 'US' AND weight < 500g → YunTu Economy
        - country IN EU_COUNTRIES AND value > $50 → DHL Express
        - country = 'BR' → 4PX Brazil Line
        ↓
Output: carrierId + channelCode + estimated_cost + estimated_days
```

### 4.3 Recommended Schema

```sql
-- Fulfillment routing rules
CREATE TABLE fulfillment_routing_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL,          -- { sku_pattern, countries, platforms, weight_range, value_range }
  result_fulfillment_type VARCHAR(30) NOT NULL, -- self | supplier_dropship | overseas_warehouse
  result_metadata JSONB               -- { warehouse_id, supplier_id, ... }
);

-- Shipping routing rules
CREATE TABLE shipping_routing_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL,          -- { countries, weight_range, value_range, platforms, sla }
  result_carrier_id UUID NOT NULL,
  result_channel_code VARCHAR(50) NOT NULL,
  result_metadata JSONB               -- { estimated_cost, estimated_days }
);
```

---

## 5. Auto-Review Rules Framework

### 5.1 Built-in Rules

| Rule ID | Description | Default Threshold |
|---------|-------------|-------------------|
| `high_value` | Order total exceeds threshold | > $500 |
| `buyer_blocklist` | Buyer username on blocklist | Match = hold |
| `address_validation` | Shipping address completeness/validity | Missing city/zip = hold |
| `duplicate_check` | Same buyer + same SKU within 24h | Duplicate = hold |
| `country_restriction` | Destination country not in allowed list | Not in list = hold |
| `margin_check` | Selling price below cost + shipping | Negative margin = hold |
| `quantity_anomaly` | Quantity exceeds normal threshold | > 10 units = hold |

### 5.2 Rule Configuration

```sql
CREATE TABLE review_rule_configs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  rule_id VARCHAR(50) NOT NULL,       -- matches rule IDs above
  enabled BOOLEAN NOT NULL DEFAULT true,
  params JSONB,                       -- rule-specific params: { threshold: 500, currency: 'USD' }
  UNIQUE(tenant_id, rule_id)
);
```

### 5.3 Auto-Review Flow

```
New order synced → Run all enabled rules in priority order
  ├── All pass → status = approved (auto)
  ├── Any rule triggers → Create hold(s) → status = on_hold
  └── Critical rule triggers → status = on_hold + notify operator
```

---

## 6. Return & Refund Flow

### 6.1 Return Lifecycle

```
return_requested → return_approved → label_sent → item_received → refund_issued → closed
                 → return_denied → closed
```

### 6.2 Refund Types

| Type | Description | Accounting Impact |
|------|-------------|-------------------|
| Full refund | 100% of order total | DR: Sales Refund, CR: Accounts Receivable |
| Partial refund | Custom amount | DR: Sales Refund (partial), CR: Accounts Receivable |
| Refund without return | Buyer keeps item | Same as full/partial refund |
| Replacement | New item shipped | DR: COGS (replacement), CR: Inventory |

### 6.3 Recommended Schema

```sql
CREATE TABLE order_returns (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  platform_return_id VARCHAR(100) NOT NULL,
  return_reason VARCHAR(100),
  return_type VARCHAR(50),           -- return_for_refund | replacement | refund_only
  refund_amount NUMERIC(19,4),
  refund_amount_currency CHAR(3),
  platform_status VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,        -- normalized
  platform VARCHAR(20) NOT NULL,
  raw_data JSONB,
  UNIQUE(platform, marketplace_id, platform_return_id)
);
```

---

## 7. Multi-Platform Order Sync Strategy

### 7.1 Sync Modes

| Mode | When to Use | Mechanism |
|------|-------------|-----------|
| Incremental | Default for all platforms | Pull orders modified since last sync |
| Full | Initial sync or data repair | Pull all orders in date range |
| Webhook | If platform supports it | Real-time push (with polling as fallback) |

### 7.2 Deduplication

```
Unique key: (platform, marketplace_id, platform_order_id)
```

- Use `dataVersion` (integer, monotonically increasing) for optimistic concurrency
- Platform API data always wins over local data during sync
- Never overwrite user-modified fields (internal_status, notes) during sync

### 7.3 Sync Architecture

```
BullMQ Cron (every 2h) → Sync Worker → Platform API
                                          ↓
                                    Transform + Normalize
                                    ├── Status mapping (platform → internal)
                                    ├── Currency normalization
                                    ├── Tax inclusive detection
                                    └── Field mapping
                                          ↓
                                    Upsert (INSERT ON CONFLICT UPDATE)
                                    ├── Increment dataVersion
                                    └── Update syncedAt + syncBatchId
```

### 7.4 Job Reentrancy Prevention

```
- One running sync job per (store, job_type) at a time
- Job starts → check for existing running job → skip if found
- Job table tracks: pending → running → completed/failed
```

---

## 8. Platform Status Normalization

Each platform has unique order status values. Map them to internal normalized status:

```typescript
// eBay
const EBAY_STATUS_MAP: Record<string, NormalizedStatus> = {
  'NOT_STARTED': 'PENDING',
  'IN_PROGRESS': 'PAID',
  'FULFILLED': 'SHIPPED',
  'DELIVERED': 'DELIVERED',
};

// Walmart
const WALMART_STATUS_MAP: Record<string, NormalizedStatus> = {
  'Created': 'PENDING',
  'Acknowledged': 'PAID',
  'Shipped': 'SHIPPED',
  'Delivered': 'DELIVERED',
  'Cancelled': 'CANCELLED',
};

// Amazon
const AMAZON_STATUS_MAP: Record<string, NormalizedStatus> = {
  'Pending': 'PENDING',
  'Unshipped': 'PAID',
  'PartiallyShipped': 'PAID',
  'Shipped': 'SHIPPED',
  'Canceled': 'CANCELLED',
  'Unfulfillable': 'CANCELLED',
};
```

---

## 9. Recommended Database Schema

### Core Tables

```sql
-- orders (unified across all platforms)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Platform identity
  platform_order_id VARCHAR(100) NOT NULL,
  store_id UUID NOT NULL,
  platform VARCHAR(20) NOT NULL,       -- ebay | walmart | amazon | mercadolibre
  marketplace_id VARCHAR(20) NOT NULL,  -- EBAY_US | EBAY_DE | walmart_us | ...

  -- Buyer
  buyer_username VARCHAR(200),

  -- Amounts (each with paired currency field)
  price_subtotal NUMERIC(19,4) NOT NULL,
  price_subtotal_currency CHAR(3) NOT NULL,
  delivery_cost NUMERIC(19,4),
  delivery_cost_currency CHAR(3),
  tax_amount NUMERIC(19,4),
  tax_amount_currency CHAR(3),
  total_amount NUMERIC(19,4) NOT NULL,
  total_amount_currency CHAR(3) NOT NULL,
  marketplace_fee NUMERIC(19,4),
  marketplace_fee_currency CHAR(3),

  -- Tax
  is_tax_inclusive BOOLEAN NOT NULL,

  -- Exchange rate snapshot
  exchange_rate NUMERIC(15,8),
  exchange_rate_date TIMESTAMPTZ,

  -- Status (multi-dimensional)
  platform_status VARCHAR(50) NOT NULL,  -- raw platform value
  status VARCHAR(30) NOT NULL,           -- normalized: PENDING/PAID/SHIPPED/...
  internal_status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  payment_status VARCHAR(30),
  fulfillment_status VARCHAR(30),
  fulfillment_type VARCHAR(30),          -- self | supplier_dropship | overseas_warehouse

  -- Sync metadata
  sync_batch_id UUID NOT NULL,
  sync_source VARCHAR(20) NOT NULL,
  raw_data JSONB,
  data_version INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  platform_created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT false,

  UNIQUE(platform, marketplace_id, platform_order_id)
);

-- order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  platform_line_item_id VARCHAR(100) NOT NULL,
  sku VARCHAR(200),
  title VARCHAR(500),
  quantity INTEGER NOT NULL,
  line_item_cost NUMERIC(19,4),
  line_item_cost_currency CHAR(3),
  total NUMERIC(19,4),
  total_currency CHAR(3),
  shipping_cost NUMERIC(19,4),
  tax_amount NUMERIC(19,4),
  promotions JSONB,
  taxes JSONB,
  UNIQUE(order_id, platform_line_item_id)
);

-- order_holds
CREATE TABLE order_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  hold_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  description VARCHAR(1000),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_note VARCHAR(1000)
);

-- order_returns
CREATE TABLE order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  platform_return_id VARCHAR(100) NOT NULL,
  return_reason VARCHAR(100),
  refund_amount NUMERIC(19,4),
  refund_amount_currency CHAR(3),
  platform_status VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  raw_data JSONB,
  UNIQUE(platform, marketplace_id, platform_return_id)
);

-- order_workflow_events (audit trail)
CREATE TABLE order_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  event_type VARCHAR(50) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  actor_type VARCHAR(20) NOT NULL,  -- user | system | platform | rule_engine
  actor_id VARCHAR(100),
  summary VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. New Platform Onboarding Checklist

```
[ ] 1. Create platform status → internal status mapping function
[ ] 2. Create marketplace → isTaxInclusive mapping
[ ] 3. Implement order sync service ({platform}-order-sync.service.ts)
       - Fetch API → field mapping → upsert orders + order_items
       - dataVersion optimistic locking
[ ] 4. Implement shipping fulfillment (tracking upload to platform)
[ ] 5. Implement refund API integration
[ ] 6. Register sync cron job in scheduler
[ ] 7. Add platform branch in sync worker
[ ] 8. Frontend: order list/detail adaptation for platform-specific fields
[ ] 9. Verify amount field precision: platform returns → NUMERIC(19,4) storage
[ ] 10. Implement return sync (if platform has separate return API)
```

---

## Lessons from Production

These lessons come from operating a cross-border ERP handling 150+ orders/day across eBay, Walmart, and Mercado Libre:

- **Don't trust platform order status directly.** eBay's "Completed" doesn't mean "Delivered" — map every platform status to your internal status explicitly. Missing this caused 200+ orders to be marked "completed" before they were even shipped.

- **Hold system saves lives.** Without typed holds (address_hold, payment_hold, fraud_hold), teams use a single boolean `isOnHold` and lose track of WHY orders are stuck. When 50 orders are on hold and you can't tell which need address correction vs. fraud review, operations grinds to a halt.

- **Fulfillment routing breaks at scale.** Hardcoded rules like "if weight < 2kg use carrier A" work for 1 warehouse. When you add a second warehouse, a supplier dropship option, and an overseas fulfillment center, you need a rule engine. Build it before you need it.

- **Multi-platform order deduplication is harder than you think.** Platform order IDs are only unique within a platform. When syncing from 3 platforms to one table, composite keys (platform + platformOrderId) are essential.

- **Cancellation race conditions are real.** A buyer cancels on eBay while your warehouse is printing the label. Without status checks at each step, you ship a cancelled order and eat the return shipping cost.
