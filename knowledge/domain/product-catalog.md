# Product Catalog Model — Cross-Platform Pattern

> Distilled from production ERP managing products across eBay, Walmart, Amazon, and MercadoLibre.

---

## 1. Three-Layer Architecture

### Why Three Layers?

Different platforms require different attributes, titles, descriptions, and categorization. A single-table design forces platform-specific fields into the core product, creating a maintenance nightmare. The three-layer architecture cleanly separates concerns:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Product (Internal, platform-agnostic)              │
│ SKU, cost, weight, dimensions, images, supplier info        │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: PlatformData (Per-platform, per-marketplace)       │
│ Localized title/desc, category mapping, item specifics      │
│ One product → many PlatformData records                     │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Listing (Published entity, per-store)              │
│ Final price, quantity, policies, platform listing ID         │
│ One PlatformData → many Listings (different stores)         │
└─────────────────────────────────────────────────────────────┘
```

### Layer Details

| Layer | Unique Key | Purpose | Who Creates |
|-------|-----------|---------|-------------|
| **Product** | `(tenant_id, sku)` | Single source of truth for internal product data | Operator or import |
| **PlatformData** | `(product_id, platform, marketplace_id, language)` | Platform-specific attributes, AI-generated or manually edited | AI generator or operator |
| **Listing** | `(store_id, platform_data_id)` | Published listing on a specific store, with final pricing and policies | Listing creation workflow |

---

## 2. Product (Layer 1) — Internal Master Data

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description_raw TEXT,                -- internal description, used as AI input
  brand VARCHAR(200),
  mpn VARCHAR(100),                    -- Manufacturer Part Number
  condition VARCHAR(50) NOT NULL DEFAULT 'NEW',

  -- Media
  images JSONB NOT NULL DEFAULT '[]',  -- [{ url, sort_order, is_primary }]

  -- Physical
  weight JSONB,                        -- { value, unit }
  dimension_length NUMERIC(10,2),
  dimension_width NUMERIC(10,2),
  dimension_height NUMERIC(10,2),
  dimension_unit VARCHAR(5) DEFAULT 'cm',

  -- Identifiers
  upc VARCHAR(50),
  ean VARCHAR(50),
  isbn VARCHAR(20),
  epid VARCHAR(50),                    -- eBay Product ID

  -- Sourcing
  cost_price NUMERIC(19,4),
  cost_currency CHAR(3),
  source_url TEXT,
  source_platform VARCHAR(20),         -- 1688 | alibaba | direct
  supplier_name VARCHAR(200),

  -- Variation
  variation_attributes JSONB NOT NULL DEFAULT '[]',
  -- Example: [{ name: "Color", values: ["Red", "Blue"] }, { name: "Size", values: ["S", "M", "L"] }]

  -- Grouping
  group_id UUID,
  template_id UUID,

  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | active | discontinued

  UNIQUE(tenant_id, sku)
);
```

---

## 3. PlatformData (Layer 2) — Platform-Specific Attributes

```sql
CREATE TABLE platform_data (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),

  -- Uniqueness: one record per product × platform × marketplace × language
  platform VARCHAR(20) NOT NULL,       -- ebay | walmart | amazon | mercadolibre
  marketplace_id VARCHAR(20) NOT NULL, -- EBAY_US | EBAY_DE | walmart_us | MLM | ...
  language VARCHAR(10) NOT NULL,       -- en | de | es | pt | fr

  -- Localized content (AI-generated or manually edited)
  title VARCHAR(500),
  description TEXT,

  -- Category mapping
  category_id VARCHAR(100),
  category_name VARCHAR(500),

  -- Platform-specific attributes
  item_specifics JSONB NOT NULL DEFAULT '{}',
  -- eBay: { "Brand": "Nike", "Type": "Running Shoes", ... }
  -- Walmart: { "brand": "Nike", "clothing_size": "M", ... }
  -- Amazon: { "item_type_name": "running-shoes", ... }

  -- Variation mapping (platform format)
  variation_specifics JSONB,
  -- eBay: { variesBy: ["Color", "Size"], specs: { "Color": [...], "Size": [...] } }

  -- SEO
  search_keywords TEXT[],

  -- Generation metadata
  generation_model VARCHAR(50),        -- AI model used
  generated_at TIMESTAMPTZ,
  is_manually_edited BOOLEAN DEFAULT false,

  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  UNIQUE(product_id, platform, marketplace_id, language)
);
```

---

## 4. Listing (Layer 3) — Published Entity

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  platform_data_id UUID REFERENCES platform_data(id),
  store_id UUID NOT NULL,              -- which store account to publish under

  -- Platform listing identity
  platform VARCHAR(20) NOT NULL,
  marketplace_id VARCHAR(20) NOT NULL,
  platform_listing_id VARCHAR(100),    -- set after successful publish

  -- Final content (merged from product + platform_data + overrides)
  title VARCHAR(500),
  description TEXT,
  images JSONB,

  -- Pricing
  price NUMERIC(19,4),
  currency CHAR(3),
  quantity INTEGER,

  -- Platform policies (eBay: fulfillment/payment/return policy IDs)
  fulfillment_policy_id VARCHAR(100),
  payment_policy_id VARCHAR(100),
  return_policy_id VARCHAR(100),

  -- Template reference
  template_id UUID,

  -- Status flow: draft → pending_review → ready → publishing → live → ended
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  publish_error TEXT,

  published_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  UNIQUE(store_id, platform_data_id)
);
```

### Listing Status Flow

```
draft → pending_review → ready → publishing → live → ended
  ↑                                  ↓          ↓
  └──────── (publish_failed) ────────┘          ↓
                                             relisted → live
```

| Status | Description |
|--------|-------------|
| `draft` | Content being prepared |
| `pending_review` | Submitted for internal review |
| `ready` | Approved, ready to publish |
| `publishing` | API call in progress |
| `live` | Active on platform |
| `ended` | Delisted (expired, manual, or platform removed) |

---

## 5. Variant Management

### 5.1 Variant SKU Naming Convention

```
{PARENT_SKU}-{ATTRIBUTE1}-{ATTRIBUTE2}
```

Examples:
- `SHOE-001-RED-S` → Red, Size S
- `SHOE-001-RED-M` → Red, Size M
- `SHOE-001-BLUE-S` → Blue, Size S

### 5.2 Variant Schema

```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  -- OR template_id for template-based variants
  sku VARCHAR(100) NOT NULL,
  price NUMERIC(19,4),
  currency CHAR(3),
  cost_price NUMERIC(19,4),
  cost_currency CHAR(3),
  quantity INTEGER NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}', -- { "Color": "Red", "Size": "S" }
  images JSONB NOT NULL DEFAULT '[]',
  dimension_length NUMERIC(10,2),
  dimension_width NUMERIC(10,2),
  dimension_height NUMERIC(10,2),
  dimension_unit VARCHAR(5) DEFAULT 'cm',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  UNIQUE(tenant_id, sku)
);
```

### 5.3 Platform Variant Mapping

Each platform has its own variant format:

| Platform | Variant Concept | Key Difference |
|----------|----------------|----------------|
| eBay | `InventoryItemGroup` + `variationSpecifics` | aspects and variesBy must be mutually exclusive |
| Amazon | `variation_theme` + child ASINs | Parent-child ASIN relationship |
| Walmart | Variant groups | Grouped by variant attributes |
| MercadoLibre | `variations` array on item | Flat variation list |

---

## 6. Duplicate Detection

Prevent the same SKU from being listed multiple times on the same store:

```typescript
// Before creating a listing
async function checkDuplicate(tenantId: string, storeId: string, productId: string): Promise<boolean> {
  const existing = await db.query.listings.findFirst({
    where: and(
      eq(listings.tenantId, tenantId),
      eq(listings.storeId, storeId),
      eq(listings.productId, productId),
      notInArray(listings.status, ['ended', 'draft'])
    )
  });
  return !!existing;
}
```

---

## 7. Image Management

### 7.1 Platform Image Requirements

| Platform | Max Images | Min Size | Recommended | Format |
|----------|-----------|----------|-------------|--------|
| eBay | 24 | 500×500 | 1600×1600 | JPG, PNG |
| Amazon | 9 | 1000×1000 | 2000×2000 | JPG, PNG, TIFF |
| Walmart | 15 | 1000×1000 | 2000×2000 | JPG, PNG |
| MercadoLibre | 10 | 500×500 | 1200×1200 | JPG, PNG |

### 7.2 Image Pipeline

```
Upload → Validate (size, format) → Compress → Upload to CDN → Store URL
                                      ↓
                              Generate variants:
                              - Thumbnail (200×200)
                              - Medium (800×800)
                              - Full (original/2000×2000)
```

### 7.3 Image Data Structure

```typescript
interface ProductImage {
  url: string;          // CDN URL
  thumbnailUrl?: string;
  sortOrder: number;
  isPrimary: boolean;
  altText?: string;
  width?: number;
  height?: number;
}
```

---

## 8. Platform-Specific Attributes (Item Specifics)

### 8.1 Two Integration Modes

**Mode A: Dynamic API** (eBay, Amazon)
- Category tree has thousands of nodes, must lazy-load
- Attributes fetched per-category from API, cached in Redis (7-day TTL)
- Attribute types: `SELECTION_ONLY` (dropdown), `FREE_TEXT` (input), `SELECTION_OR_FREE_TEXT` (combo)

**Mode B: Static Mapping** (Walmart, smaller catalogs)
- Category tree is small enough to embed as constants
- Attributes defined in static mapping tables extracted from platform documentation
- API attempted first, falls back to static data

### 8.2 Attribute Editor UI Pattern

Three-tier grouping:
1. **Required** (red tag) — must be filled before publishing
2. **Recommended** (blue tag) — improves search ranking
3. **Optional** — nice to have

All attribute fields should provide selectable values where possible (dropdown/autocomplete), not just empty text inputs.

---

## 9. AI Content Generation

### 9.1 Generation Flow

```
Product (internal data) + Marketplace context
  → AI prompt (with platform SEO rules)
  → Generated: title + description + item specifics + search keywords
  → Stored in PlatformData
  → Operator review + edit
```

### 9.2 Per-Field Regeneration

Allow regenerating individual fields without affecting others:
- Title only
- Description only
- Category suggestion
- Item specifics fill
- Search keywords

This is important because operators often want to keep a manually-tuned title but regenerate the description.

---

## 10. New Platform Onboarding Checklist

```
[ ] 1. Add marketplace-language mapping for the new platform
[ ] 2. platform_data table supports new platform value (generic schema, no migration needed)
[ ] 3. Create platform engine module: src/modules/{platform}-engine/
       - {platform}-client.ts (API wrapper)
       - taxonomy/category service
[ ] 4. Implement AI content generation prompt for platform SEO rules
[ ] 5. Implement publish flow: platformData + product → platform listing
[ ] 6. Handle variant mapping (platform-specific variant format)
[ ] 7. Handle product identifier mapping (ASIN / GTIN / UPC / ePID)
[ ] 8. Adapt listing status flow (platform review process differences)
[ ] 9. Frontend: platform data generation page adaptation
[ ] 10. Frontend: listing draft editor adaptation (policy references differ by platform)
```
