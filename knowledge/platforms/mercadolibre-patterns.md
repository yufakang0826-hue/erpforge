# MercadoLibre Integration Patterns

> Patterns for integrating with MercadoLibre API across Latin American markets. Covers OAuth across 12 site IDs, core APIs, known quirks, and best practices.

---

## 1. Authentication — OAuth2 Authorization Code

### 1.1 Flow

```
1. Register app at https://developers.mercadolibre.com/
   → Get APP_ID + CLIENT_SECRET

2. Redirect seller to consent page:
   https://auth.mercadolibre.com.{TLD}/authorization?
     response_type=code&
     client_id={APP_ID}&
     redirect_uri={REDIRECT_URI}&
     state={CSRF_TOKEN}

   Note: TLD varies by country (.com.ar, .com.mx, .com.br, etc.)

3. Seller approves → callback with ?code=xxx

4. Exchange code for tokens:
   POST https://api.mercadolibre.com/oauth/token
   Body: {
     grant_type: "authorization_code",
     client_id: APP_ID,
     client_secret: CLIENT_SECRET,
     code: xxx,
     redirect_uri: REDIRECT_URI
   }

5. Response: { access_token, refresh_token, expires_in: 21600 }
```

### 1.2 Token Management

- Access token expires in **6 hours**
- Refresh token must be used before access token expires
- Refresh token is single-use (new one returned with each refresh)

```typescript
async function refreshToken(store: Store): Promise<TokenResponse> {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: APP_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: store.refreshToken,
    }),
  });
  // IMPORTANT: Store the new refresh_token from response (single-use!)
  return response.json();
}
```

### 1.3 Site IDs (12 Markets)

| Site ID | Country | TLD | Currency |
|---------|---------|-----|----------|
| `MLA` | Argentina | .com.ar | ARS |
| `MLB` | Brazil | .com.br | BRL |
| `MLC` | Chile | .cl | CLP |
| `MCO` | Colombia | .com.co | COP |
| `MCR` | Costa Rica | .co.cr | CRC |
| `MEC` | Ecuador | .com.ec | USD |
| `MLM` | Mexico | .com.mx | MXN |
| `MLU` | Uruguay | .com.uy | UYU |
| `MLV` | Venezuela | .com.ve | VES |
| `MPA` | Panama | .com.pa | USD |
| `MPE` | Peru | .com.pe | PEN |
| `MRD` | Dominican Republic | .com.do | DOP |

---

## 2. Core APIs

### 2.1 API Overview

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Items** | `/items` | Product listing CRUD |
| **Orders** | `/orders` | Order management |
| **Questions** | `/questions` | Buyer Q&A |
| **Shipments** | `/shipments` | Mercado Envios management |
| **Users** | `/users` | Seller account info |
| **Categories** | `/categories` | Category tree |
| **Advertising** | `/advertising` | Product Ads |

### 2.2 Items API

```
GET  /items/{ITEM_ID}                              → Item detail
POST /items                                         → Create item
PUT  /items/{ITEM_ID}                              → Update item
PUT  /items/{ITEM_ID}/description                  → Update description

GET  /users/{USER_ID}/items/search?status=active    → List seller items
GET  /sites/{SITE_ID}/categories                    → Category tree
GET  /categories/{CATEGORY_ID}/attributes           → Category attributes (Ficha Técnica)
```

### 2.3 Orders API

```
GET /orders/search?seller={SELLER_ID}&order.date_created.from=...  → Order list
GET /orders/{ORDER_ID}                                              → Order detail
POST /orders/{ORDER_ID}/notes                                       → Add note
```

### 2.4 Shipping (Mercado Envios)

```
GET  /shipments/{SHIPMENT_ID}                      → Shipment detail
GET  /shipments/{SHIPMENT_ID}/items                → Shipment items
POST /shipments/{SHIPMENT_ID}/tracking             → Update tracking
```

### 2.5 Questions API

```
GET  /questions/search?item={ITEM_ID}&status=unanswered → Unanswered questions
POST /answers                                            → Answer a question
```

---

## 3. Item Structure (Ficha Técnica)

### 3.1 Item Creation

MercadoLibre items have a flat structure with variations:

```json
{
  "title": "Zapatillas Nike Air Max 90",
  "category_id": "MLM1234",
  "price": 2499.90,
  "currency_id": "MXN",
  "available_quantity": 10,
  "buying_mode": "buy_it_now",
  "listing_type_id": "gold_special",
  "condition": "new",
  "description": { "plain_text": "..." },
  "pictures": [{ "source": "https://..." }],
  "attributes": [
    { "id": "BRAND", "value_name": "Nike" },
    { "id": "MODEL", "value_name": "Air Max 90" },
    { "id": "MAIN_COLOR", "value_name": "Black" }
  ],
  "variations": [
    {
      "attribute_combinations": [
        { "id": "SIZE", "value_name": "8 US" },
        { "id": "COLOR", "value_name": "Black" }
      ],
      "available_quantity": 5,
      "price": 2499.90,
      "picture_ids": ["123456-MLA"]
    }
  ]
}
```

### 3.2 Category Attributes

Each category has required and optional attributes (Ficha Técnica):

```
GET /categories/{CATEGORY_ID}/attributes

Response: [
  {
    "id": "BRAND",
    "name": "Marca",
    "tags": { "required": true },
    "value_type": "string",
    "values": [{ "id": "123", "name": "Nike" }, ...]
  },
  ...
]
```

---

## 4. Known Quirks

### 4.1 Critical

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `meli-sdk-abandoned` | Official JS SDK last updated 2021 | Missing features, security issues | Build custom HTTP client |
| `meli-site-api-diff` | API behavior differs between sites (MLA vs MLM vs MLB) | Unexpected errors per site | Test each target site independently |
| `meli-single-use-refresh` | Refresh token is single-use; if refresh fails, need re-auth | Lost access | Atomic token update, retry once, then re-auth flow |

### 4.2 High

| ID | Issue | Impact | Workaround |
|----|-------|--------|------------|
| `meli-auth-tld` | Authorization URL TLD varies by country | Wrong consent page | Map site_id → auth TLD |
| `meli-description-separate` | Description is a separate API endpoint, not part of item | Extra API call needed | Fetch description separately on detail view |
| `meli-variation-price` | Variations can have different prices (unlike eBay) | Pricing logic more complex | Handle per-variation pricing |
| `meli-rate-limit` | Rate limits vary by app reputation and endpoint | Unpredictable throttling | Implement adaptive rate limiting |

### 4.3 Medium

| ID | Issue | Workaround |
|----|-------|------------|
| `meli-currency-no-decimal` | Some currencies (CLP, COP) have no decimals | Round prices appropriately per currency |
| `meli-category-tree-large` | Category tree varies significantly per site | Cache per-site category trees |
| `meli-questions-sla` | Must answer questions within 24h or ranking penalty | Auto-notification for unanswered questions |
| `meli-free-shipping-threshold` | Free shipping qualification varies by seller level | Check seller status before applying |

---

## 5. Best Practices

### 5.1 Custom HTTP Client

Since the official SDK is abandoned, build a custom client:

```typescript
class MeliClient {
  constructor(
    private readonly appId: string,
    private readonly clientSecret: string,
    private readonly baseUrl = 'https://api.mercadolibre.com',
  ) {}

  async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const token = await this.getAccessToken(options?.storeId);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5');
      await sleep(retryAfter * 1000);
      return this.request(method, path, options);
    }

    if (!response.ok) {
      throw new MeliApiError(response.status, await response.json());
    }

    return response.json() as T;
  }
}
```

### 5.2 Order Sync Strategy

```
1. Pull orders by date range (created + updated)
2. MercadoLibre has its own order status flow:
   - confirmed → payment_required → paid → shipped → delivered
3. Map to internal status accordingly
4. Shipping via Mercado Envios is tightly integrated
   - Some categories REQUIRE Mercado Envios
   - Check item's shipping mode before attempting custom shipping
```

### 5.3 Multi-Site Architecture

```typescript
// Each site may need different handling
const SITE_CONFIG: Record<string, SiteConfig> = {
  MLM: { currency: 'MXN', locale: 'es-MX', decimalPlaces: 2 },
  MLB: { currency: 'BRL', locale: 'pt-BR', decimalPlaces: 2 },
  MLA: { currency: 'ARS', locale: 'es-AR', decimalPlaces: 2 },
  MLC: { currency: 'CLP', locale: 'es-CL', decimalPlaces: 0 }, // No decimals!
  MCO: { currency: 'COP', locale: 'es-CO', decimalPlaces: 0 }, // No decimals!
};
```

### 5.4 Question Management

Questions (preguntas) are a critical part of MercadoLibre selling:
- Unanswered questions hurt search ranking
- Response time affects seller reputation
- Consider AI-powered auto-response for common questions
- Use webhook notifications for real-time question alerts

### 5.5 Error Handling

```typescript
interface MeliError {
  message: string;
  error: string;
  status: number;
  cause: Array<{
    code: string;
    message: string;
    data: Record<string, unknown>;
  }>;
}
```

Common error patterns:
- `forbidden` — Token expired or insufficient scope
- `not_found` — Item/order doesn't exist or belongs to different user
- `validation_error` — Item attributes don't match category requirements
