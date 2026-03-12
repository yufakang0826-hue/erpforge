# Pricing Model — Cross-Border E-Commerce

> Distilled from production ERP managing pricing across eBay (28 fee types), Walmart, Amazon, and MercadoLibre.

---

## 1. Cost-Driven Pricing Formula

### 1.1 Core Formula

```
selling_price = (COGS + shipping_cost) / (1 - platform_fee_rate - target_margin)
```

Where:
- **COGS** = Cost of Goods Sold (purchase price + inbound shipping to warehouse)
- **shipping_cost** = Estimated outbound shipping to buyer
- **platform_fee_rate** = Total platform fees as a percentage of selling price
- **target_margin** = Desired profit margin as a decimal (e.g., 0.20 = 20%)

### 1.2 Expanded Formula

```
selling_price = (COGS + outbound_shipping + packaging_cost)
              / (1 - commission_rate - payment_processing_rate - advertising_rate - target_margin)
```

### 1.3 Example Calculation

```
COGS = $8.00 (product) + $2.00 (inbound shipping) = $10.00
Outbound shipping = $5.50
Packaging = $0.50
Total cost = $16.00

Platform fee rate = 13% (eBay Final Value Fee)
Payment processing = 2.9% + $0.30
Advertising = 5% (Promoted Listing)
Target margin = 15%

selling_price = $16.00 / (1 - 0.13 - 0.029 - 0.05 - 0.15)
             = $16.00 / 0.641
             = $24.96

Verify:
  Revenue: $24.96
  - Commission (13%): -$3.24
  - Payment (2.9% + $0.30): -$1.02
  - Advertising (5%): -$1.25
  - COGS + shipping: -$16.00
  = Profit: $3.45 (13.8% margin, close to 15% target)
```

---

## 2. Platform Fee Mapping

### 2.1 eBay Fee Types (28 types)

| Category | Fee Type | Typical Rate | When Charged |
|----------|----------|-------------|--------------|
| **Listing** | Insertion Fee | $0.35/listing (after free quota) | On listing creation |
| **Sale** | Final Value Fee | 3-15% (category-dependent) | On sale |
| **Sale** | Final Value Fee - Fixed | $0.30/order | On sale |
| **Payment** | Payment Processing Fee | Included in FVF | On sale |
| **Advertising** | Promoted Listings Standard | 2-20% (seller-set) | On ad-attributed sale |
| **Advertising** | Promoted Listings Advanced | CPC (cost per click) | On click |
| **International** | International Fee | 1.65% | Cross-border transactions |
| **Subscription** | Store Subscription | $7.95-$349.95/mo | Monthly |
| **Regulatory** | Regulatory Operating Fee | 0.3-0.45% | On sale |
| **Other** | Below Standard Fee | +5% FVF | Poor seller performance |

### 2.2 Amazon Fee Types

| Category | Fee Type | Typical Rate |
|----------|----------|-------------|
| **Sale** | Referral Fee | 6-45% (category, typically 15%) |
| **FBA** | FBA Fulfillment Fee | $3.22-$10.48/unit (size-based) |
| **FBA** | Monthly Storage Fee | $0.87-$2.40/cu ft |
| **FBA** | Long-Term Storage Fee | $6.90/cu ft (365+ days) |
| **Advertising** | Sponsored Products | CPC |
| **Subscription** | Professional Plan | $39.99/mo |
| **Other** | Closing Fee (media) | $1.80/item |

### 2.3 Walmart Fee Types

| Category | Fee Type | Typical Rate |
|----------|----------|-------------|
| **Sale** | Referral Fee | 6-20% (category-dependent) |
| **WFS** | WFS Fulfillment Fee | Size/weight-based |
| **WFS** | WFS Storage Fee | Monthly per unit |
| **Advertising** | Sponsored Products | CPC |
| **Other** | Return Shipping | Seller-paid for some categories |

### 2.4 MercadoLibre Fee Types

| Category | Fee Type | Typical Rate |
|----------|----------|-------------|
| **Sale** | Commission | 11-17.5% (seller level + category) |
| **Shipping** | Mercado Envios | Subsidized or seller-paid |
| **Advertising** | Product Ads | CPC |
| **Financing** | Installment Absorption | If seller offers financing |

### 2.5 Normalized Fee Categories

Map all platform-specific fees to unified categories for reporting:

```typescript
type NormalizedFeeCategory =
  | 'listing_fee'           // Insertion fees, listing charges
  | 'commission'            // Final value fee, referral fee
  | 'payment_processing'    // Payment handling fees
  | 'advertising'           // All ad-related fees
  | 'fulfillment'           // FBA/WFS fulfillment fees
  | 'storage'               // Warehouse storage fees
  | 'shipping_label'        // Platform-purchased shipping labels
  | 'international'         // Cross-border fees
  | 'regulatory'            // Regulatory/compliance fees
  | 'subscription'          // Store/plan subscription
  | 'return_fee'            // Return processing fees
  | 'other';                // Unclassified fees
```

---

## 3. Dynamic Pricing Strategies

### 3.1 Strategy Dimensions

| Dimension | Signal | Action |
|-----------|--------|--------|
| **Inventory** | Stock level dropping | Raise price to slow sales |
| **Inventory** | Stock level high / slow-moving | Lower price to clear |
| **Competition** | Competitor lowers price | Match or undercut (within margin floor) |
| **Competition** | Competitor out of stock | Raise price (market scarcity) |
| **Seasonality** | Peak season approaching | Raise price gradually |
| **Seasonality** | Off-season | Lower price, run promotions |
| **Sales velocity** | High sell-through rate | Test higher price point |
| **Sales velocity** | Declining sales | Investigate or reduce price |
| **Platform ranking** | Low search ranking | Consider promoted listing or price reduction |
| **Margin** | Below minimum margin | Floor price alert, no further reduction |

### 3.2 Price Boundaries

```typescript
interface PriceRules {
  floorPrice: number;     // Absolute minimum (cost + min margin)
  ceilingPrice: number;   // Maximum reasonable price
  minMargin: number;      // Minimum acceptable margin (e.g., 0.05 = 5%)
  maxDiscount: number;    // Maximum discount from base price (e.g., 0.30 = 30%)
  roundTo: number;        // Price rounding (e.g., 0.99 or 0.95)
}
```

### 3.3 Price Adjustment Rule Schema

```sql
CREATE TABLE price_adjustment_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(30) NOT NULL,      -- inventory | competition | schedule | velocity
  conditions JSONB NOT NULL,           -- trigger conditions
  adjustment JSONB NOT NULL,           -- { type: 'percentage' | 'fixed', value: -5.0 }
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to JSONB,                    -- { skus, categories, platforms, stores }
  schedule JSONB,                      -- { cron, timezone } for time-based rules
  min_margin NUMERIC(5,4),             -- floor margin override
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Profit Simulator

### 4.1 Input → Output

```typescript
interface ProfitSimulatorInput {
  sellingPrice: number;
  sellingCurrency: string;
  costPrice: number;
  costCurrency: string;
  shippingCost: number;
  shippingCurrency: string;
  platform: 'ebay' | 'amazon' | 'walmart' | 'mercadolibre';
  marketplace: string;
  category: string;            // for platform-specific fee rates
  quantity: number;
  exchangeRate?: number;       // if currencies differ
  advertisingRate?: number;    // optional: promoted listing %
}

interface ProfitSimulatorOutput {
  revenue: number;             // selling_price × quantity
  cogs: number;                // cost_price × quantity
  platformFees: {
    commission: number;
    paymentProcessing: number;
    internationalFee: number;
    regulatoryFee: number;
    total: number;
  };
  shippingCost: number;
  advertisingCost: number;
  grossProfit: number;
  grossMargin: number;         // as percentage
  netProfit: number;
  netMargin: number;
  breakEvenPrice: number;      // minimum price for 0% margin
  roiPercentage: number;       // profit / total_cost × 100
}
```

### 4.2 Calculation Engine

```typescript
function simulateProfit(input: ProfitSimulatorInput): ProfitSimulatorOutput {
  const { sellingPrice, costPrice, shippingCost, platform, marketplace, category, quantity } = input;

  // 1. Get platform fee rates for this category
  const feeRates = getPlatformFeeRates(platform, marketplace, category);

  // 2. Calculate individual fees
  const revenue = sellingPrice * quantity;
  const commission = revenue * feeRates.commissionRate;
  const paymentFee = revenue * feeRates.paymentRate + (feeRates.paymentFixed * quantity);
  const internationalFee = feeRates.isInternational ? revenue * feeRates.internationalRate : 0;
  const regulatoryFee = revenue * (feeRates.regulatoryRate ?? 0);
  const advertisingCost = revenue * (input.advertisingRate ?? 0);
  const totalFees = commission + paymentFee + internationalFee + regulatoryFee;

  // 3. Calculate profit
  const totalCogs = costPrice * quantity;
  const totalShipping = shippingCost * quantity;
  const grossProfit = revenue - totalCogs - totalFees - totalShipping - advertisingCost;
  const netProfit = grossProfit; // before tax

  // 4. Calculate margins
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // 5. Break-even price
  const totalCostPerUnit = costPrice + shippingCost;
  const totalFeeRate = feeRates.commissionRate + feeRates.paymentRate + (input.advertisingRate ?? 0);
  const breakEvenPrice = totalCostPerUnit / (1 - totalFeeRate);

  // 6. ROI
  const totalInvestment = totalCogs + totalShipping;
  const roiPercentage = totalInvestment > 0 ? (grossProfit / totalInvestment) * 100 : 0;

  return {
    revenue,
    cogs: totalCogs,
    platformFees: { commission, paymentProcessing: paymentFee, internationalFee, regulatoryFee, total: totalFees },
    shippingCost: totalShipping,
    advertisingCost,
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
    breakEvenPrice,
    roiPercentage,
  };
}
```

---

## 5. Platform Fee Rate Data Structure

```typescript
interface PlatformFeeRates {
  platform: string;
  marketplace: string;
  category: string;
  commissionRate: number;              // e.g., 0.13 for 13%
  paymentRate: number;                 // e.g., 0.029 for 2.9%
  paymentFixed: number;                // e.g., 0.30 for $0.30/order
  internationalRate: number;           // e.g., 0.0165 for 1.65%
  isInternational: boolean;
  regulatoryRate?: number;             // e.g., 0.003 for 0.3%
  fbaFulfillmentFee?: number;          // per unit, for Amazon FBA
  storageFeeCuFt?: number;             // per cubic foot per month
}

// Example fee rate database
const FEE_RATES: Record<string, PlatformFeeRates> = {
  'ebay:EBAY_US:electronics': {
    platform: 'ebay', marketplace: 'EBAY_US', category: 'electronics',
    commissionRate: 0.1315, paymentRate: 0, paymentFixed: 0.30,
    internationalRate: 0.0165, isInternational: false, regulatoryRate: 0.003,
  },
  'amazon:ATVPDKIKX0DER:electronics': {
    platform: 'amazon', marketplace: 'ATVPDKIKX0DER', category: 'electronics',
    commissionRate: 0.08, paymentRate: 0, paymentFixed: 0,
    internationalRate: 0, isInternational: false,
    fbaFulfillmentFee: 5.49, storageFeeCuFt: 0.87,
  },
  // ... more entries
};
```

---

## 6. Multi-Currency Pricing

### 6.1 Cross-Currency Pricing

When the product cost is in CNY but the selling currency is USD:

```
cost_in_selling_currency = cost_cny / exchange_rate_cny_to_selling
selling_price = cost_in_selling_currency / (1 - fee_rate - margin)
```

### 6.2 Exchange Rate Impact

Exchange rates should be refreshed at least daily. Pricing should include a buffer for FX volatility:

```typescript
const FX_BUFFER = 0.02; // 2% buffer for exchange rate fluctuation

function adjustedCost(costCNY: number, exchangeRate: number): number {
  return costCNY / exchangeRate * (1 + FX_BUFFER);
}
```

### 6.3 Price Rounding by Marketplace

| Marketplace | Convention | Example |
|------------|-----------|---------|
| US | .99 ending | $24.99 |
| UK | .99 ending | £19.99 |
| DE | .99 ending | €29.99 |
| MX | Round to integer | $499 MXN |
| BR | .90 ending | R$149.90 |

---

## 7. Competitive Pricing Data Structure

```sql
CREATE TABLE competitor_prices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  sku VARCHAR(200) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  marketplace VARCHAR(20) NOT NULL,
  competitor_listing_id VARCHAR(100),
  competitor_price NUMERIC(19,4) NOT NULL,
  competitor_currency CHAR(3) NOT NULL,
  competitor_shipping NUMERIC(19,4),
  competitor_seller VARCHAR(200),
  is_buy_box_winner BOOLEAN,           -- Amazon specific
  scraped_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(30) NOT NULL           -- manual | api | scraper
);
```

---

## 8. Price History & Analytics

```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  sku VARCHAR(200) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  old_price NUMERIC(19,4),
  new_price NUMERIC(19,4),
  currency CHAR(3) NOT NULL,
  change_reason VARCHAR(50),           -- manual | rule:{rule_id} | competition | promotion
  changed_by VARCHAR(100),             -- user_id | system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This enables:
- Price trend analysis
- Impact of price changes on sales velocity
- A/B testing different price points
- Identifying optimal price ranges per category/market
