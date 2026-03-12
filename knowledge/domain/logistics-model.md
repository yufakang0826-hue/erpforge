# Logistics & Shipping Model — Cross-Border E-Commerce

> Distilled from production ERP managing shipments across domestic carriers, international logistics providers (YunTu, YanWen, 4PX), and platform shipping (eBay, Amazon Buy Shipping, Walmart Shipping Label).

---

## 1. Carrier Provider Abstraction

### 1.1 Interface Definition

```typescript
interface CarrierProvider {
  readonly providerCode: string; // 'yuntu' | 'yanwen' | '4px' | 'dhl' | ...

  /**
   * Get shipping quotes for a package
   */
  getQuote(params: QuoteRequest): Promise<Quote[]>;

  /**
   * Create a shipment and get tracking number
   */
  createShipment(params: CreateShipmentRequest): Promise<Shipment>;

  /**
   * Get current tracking status and events
   */
  getTracking(trackingNumber: string): Promise<TrackingResult>;

  /**
   * Cancel a shipment (if not yet picked up)
   */
  cancelShipment(shipmentId: string): Promise<CancelResult>;

  /**
   * Get shipping label (PDF or ZPL)
   */
  getLabel(shipmentId: string, format: 'pdf' | 'zpl'): Promise<Buffer>;
}

interface QuoteRequest {
  originCountry: string;      // ISO 3166-1 alpha-2
  destinationCountry: string;
  weight: { value: number; unit: 'g' | 'kg' };
  dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'in' };
  declaredValue?: { amount: number; currency: string };
  serviceType?: string;       // express | standard | economy
}

interface Quote {
  channelCode: string;
  channelName: string;
  estimatedCost: { amount: number; currency: string };
  estimatedDays: { min: number; max: number };
  weightLimit: { min: number; max: number; unit: 'g' };
  restrictions?: string[];
}

interface CreateShipmentRequest {
  orderId: string;
  carrier: { id: string; channelCode: string };
  sender: Address;
  recipient: Address;
  packages: Package[];
  items: DeclaredItem[];      // for customs declaration
  serviceType?: string;
}

interface Shipment {
  shipmentId: string;
  trackingNumber: string;
  carrierOrderNumber?: string;
  labelUrl?: string;
  estimatedCost: { amount: number; currency: string };
  status: ShipmentStatus;
}
```

---

## 2. Logistics Routing Engine

### 2.1 Input → Output

```
Input:
  - destination_country (ISO 3166-1 alpha-2)
  - package_weight (grams)
  - package_dimensions (cm) → volumetric weight
  - order_value (for insurance/customs)
  - platform (eBay/Amazon/Walmart/MeLi)
  - SLA requirement (economy/standard/express)
  - origin_warehouse (CN/US-WEST/US-EAST/EU)

Output:
  - recommended_carrier_id + channel_code
  - estimated_cost (in shipping currency)
  - estimated_delivery_days
  - alternative options (top 3)
```

### 2.2 Routing Rule Conditions

```typescript
interface RoutingRuleConditions {
  countries?: string[];             // destination countries
  countryExclude?: string[];        // excluded countries
  platforms?: string[];             // selling platforms
  weightRange?: { min: number; max: number }; // grams
  valueRange?: { min: number; max: number };  // order value in USD
  skuPatterns?: string[];           // SKU prefix matching
  originWarehouse?: string[];       // warehouse codes
  serviceLevel?: 'economy' | 'standard' | 'express';
}
```

### 2.3 Rule Evaluation

```
1. Load all active rules, sorted by priority (lower number = higher priority)
2. For each rule, evaluate conditions against the order
3. First matching rule wins
4. If no rule matches → use default carrier/channel
5. Log the matched rule ID on the order for audit
```

---

## 3. Shipping Cost Calculation

### 3.1 Weight Calculation

```typescript
function calculateBillableWeight(params: {
  actualWeightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumetricDivisor: number; // typically 5000 or 6000
  useVolumetricWeight: boolean;
}): number {
  if (!params.useVolumetricWeight) return params.actualWeightG;

  const volumetricWeightG =
    (params.lengthCm * params.widthCm * params.heightCm) / params.volumetricDivisor * 1000;

  return Math.max(params.actualWeightG, volumetricWeightG); // take the greater
}
```

### 3.2 Cost Formula

```
shipping_cost =
  base_price                          // first weight unit
  + extra_price × ceil((billable_weight - base_weight) / extra_weight_step)
  + fuel_surcharge (base × surcharge_rate)
  + remote_area_surcharge (if applicable)
  + insurance_fee (if declared value exceeds threshold)

// Minimum charge applies
shipping_cost = max(shipping_cost, min_charge)
```

### 3.3 Rate Template Schema

```sql
CREATE TABLE shipping_rate_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  carrier_id UUID NOT NULL,
  channel_id UUID,
  name VARCHAR(200) NOT NULL,
  destination_country CHAR(2) NOT NULL,
  weight_unit VARCHAR(5) NOT NULL DEFAULT 'g',
  base_weight_g INTEGER,              -- first weight bracket (e.g., 100g)
  base_price NUMERIC(10,4),           -- price for first bracket
  extra_weight_g INTEGER,             -- additional weight step (e.g., 100g)
  extra_price NUMERIC(10,4),          -- price per additional step
  weight_min_g INTEGER,               -- minimum accepted weight
  weight_max_g INTEGER,               -- maximum accepted weight
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  fuel_surcharge_rate NUMERIC(5,4),   -- e.g., 0.12 = 12%
  min_charge NUMERIC(10,4),           -- minimum total charge
  volumetric_divisor INTEGER DEFAULT 5000,
  use_volumetric_weight BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);
```

---

## 4. Label Management

### 4.1 Label Formats

| Format | Use Case | Printer Type |
|--------|----------|-------------|
| PDF | Desktop printing, universal | Any printer |
| ZPL | Warehouse thermal printers | Zebra/TSC label printers |
| PNG | Web preview | Screen display |

### 4.2 Label Generation Flow

```
Order confirmed + carrier selected
  → Call carrier API: createShipment()
  → Receive: tracking_number + label_url/label_data
  → Store label (S3/local) + tracking number
  → Update shipment record
```

### 4.3 Batch Label Printing

```
1. Select multiple orders (same carrier preferred)
2. For each order → generate shipment + label
3. Merge PDFs into single document
4. Print batch
5. Update all orders: status → ready_to_ship
```

---

## 5. Tracking & Anomaly Detection

### 5.1 Tracking Status Normalization

```typescript
type ShipmentStatus =
  | 'CREATED'       // Label created, not yet picked up
  | 'PICKED_UP'     // Carrier has the package
  | 'IN_TRANSIT'    // Moving through carrier network
  | 'CUSTOMS'       // At customs (import/export)
  | 'OUT_FOR_DELIVERY' // Last mile delivery
  | 'DELIVERED'     // Successfully delivered
  | 'RETURNED'      // Returned to sender
  | 'EXCEPTION';    // Problem occurred (lost, damaged, customs hold)
```

### 5.2 Tracking Event Schema

```sql
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  event_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50),
  location VARCHAR(200),
  description TEXT,
  raw_data JSONB
);
```

### 5.3 Anomaly Detection Rules

| Anomaly Type | Detection Rule | Severity |
|-------------|---------------|----------|
| `no_update` | No tracking event for N days after creation | warning (3d) / critical (7d) |
| `stuck_in_transit` | Same status for N days | warning (7d) / critical (14d) |
| `delivery_exception` | Carrier reports exception event | critical |
| `customs_hold` | Stuck at customs for N days | warning (5d) / critical (10d) |
| `cost_variance` | Actual cost differs from estimated by >X% | warning (20%) / critical (50%) |
| `return_to_sender` | Package returned | critical |

### 5.4 Anomaly Schema

```sql
CREATE TABLE shipping_anomalies (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  type VARCHAR(30) NOT NULL,
  severity VARCHAR(10) NOT NULL,       -- warning | critical
  message TEXT NOT NULL,
  metadata JSONB,                      -- { days_since_update, variance_amount, ... }
  detected_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

---

## 6. Tracking Upload to Platform

After generating a tracking number, it must be uploaded to the selling platform:

```
Shipment created (tracking_number obtained)
  → Call platform API to create fulfillment:
      eBay:    createShippingFulfillment(orderId, { trackingNumber, carrier })
      Amazon:  confirmShipment(orderId, { trackingNumber, carrier })
      Walmart: shipOrder(purchaseOrderId, { trackingNumber, carrier, lineItems })
  → Update order: fulfillment_status = 'fulfilled', status = 'SHIPPED'
  → Update shipment: tracking_upload_status = 'uploaded'
```

### Upload Status Tracking

```sql
-- On the shipments table
tracking_upload_status VARCHAR(20) DEFAULT 'pending',
  -- pending | uploading | uploaded | failed
tracking_uploaded_at TIMESTAMPTZ,
tracking_upload_error TEXT,
platform_fulfillment_id VARCHAR(100),  -- ID returned by platform
```

### Retry Logic

- Failed uploads should be retried with exponential backoff
- After 3 failures, mark as `failed` and alert operator
- Background worker periodically checks for `pending` uploads

---

## 7. Multi-Warehouse Allocation Strategy

### 7.1 Allocation Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Nearest** | Ship from warehouse closest to destination | Fastest delivery |
| **Stock priority** | Ship from warehouse with most stock | Prevent stockouts |
| **Cost optimal** | Ship from warehouse with lowest shipping cost | Cost reduction |
| **Round robin** | Distribute evenly across warehouses | Load balancing |

### 7.2 Allocation Flow

```
Order received → Check inventory across all warehouses
  → Apply allocation strategy
  → Reserve inventory (status: reserved)
  → Pick & pack (status: confirmed)
  → Ship (status: shipped)
  → OR release reservation if order cancelled (status: released)
```

### 7.3 Allocation Schema

```sql
CREATE TABLE order_allocations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  sku VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
    -- reserved → confirmed → shipped | released
  reserved_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);
```

---

## 8. Platform Shipping Differences

| Dimension | eBay | Amazon | Walmart |
|-----------|------|--------|---------|
| Built-in labels | No (need 3rd party) | Buy Shipping API | Shipping Label API |
| Fulfillment API | createShippingFulfillment | confirmShipment | shipOrder |
| Partial shipment | Yes (line-item level) | Yes | Yes (orderLine level) |
| Carrier codes | eBay-specific enum | Amazon carrier list | Walmart carrier list |
| Return labels | Post-Order Return API | Returns API | Return Label API |
| Platform logistics | N/A | FBA (auto-fulfill) | WFS (auto-fulfill) |
| Tracking API | None (eBay tracks it) | getTracking | trackShipment |
| Shipping discounts | None | Buy Shipping discount | Platform discount |

### Platform-Managed Logistics (FBA / WFS)

- **Amazon FBA**: Inventory shipped to Amazon warehouses; Amazon handles fulfillment
- **Walmart WFS**: Similar to FBA, Walmart warehouses
- **ERP must detect**: If order is FBA/WFS, skip shipping operations entirely
- **Field indicator**: `fulfillment_channel = 'AFN'` (Amazon) or similar platform flag

---

## 9. Shipping Cost Records

Track actual costs for reconciliation and profit calculation:

```sql
CREATE TABLE shipping_cost_records (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  shipment_id UUID REFERENCES shipments(id),
  order_id UUID,
  carrier_code VARCHAR(50),
  weight_g INTEGER,
  base_cost NUMERIC(10,4),
  fuel_surcharge NUMERIC(10,4),
  insurance_fee NUMERIC(10,4),
  other_fees NUMERIC(10,4),
  total_cost NUMERIC(10,4),
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  cost_date DATE
);
```

---

## 10. New Platform Onboarding Checklist

```
[ ] 1. Confirm platform shipping fulfillment API (tracking upload endpoint)
[ ] 2. Confirm if platform provides built-in label purchase (Buy Shipping equivalent)
[ ] 3. Map carrier codes: platform carrier code ↔ internal carrier code
[ ] 4. Implement: shipping fulfillment service (tracking → platform API)
[ ] 5. Implement: shipment record query
[ ] 6. Check for platform-managed logistics (FBA/WFS), add order type detection
[ ] 7. Return labels: confirm platform return label API
[ ] 8. Frontend: shipping dialog adaptation (carrier dropdown + tracking input)
[ ] 9. Label format handling (PDF/ZPL preview and printing)
[ ] 10. Third-party logistics evaluation (ShipStation/EasyPost/4PX integration)
[ ] 11. Multi-warehouse routing rule configuration
[ ] 12. Tracking status sync (if platform provides tracking API)
```
