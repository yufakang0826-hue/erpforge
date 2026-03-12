# Module Boundaries & Communication Patterns

> Defines how ERP modules are structured, how they communicate, and what anti-patterns to avoid.

---

## 1. Module Directory Structure

Each business domain is a self-contained module:

```
src/modules/{name}/
├── routes.ts      # Express route definitions (HTTP layer)
├── service.ts     # Business logic (core domain)
├── schema.ts      # Drizzle ORM table definitions
├── types.ts       # Zod validation schemas + TypeScript types
├── index.ts       # Module entry point (exports router + public API)
├── public-api.ts  # Public interface for other modules (optional)
└── {name}.test.ts # Tests
```

### File Responsibilities

| File | Responsibility | Allowed Dependencies |
|------|---------------|---------------------|
| `routes.ts` | HTTP request/response handling, parameter parsing, auth checks | `service.ts`, `types.ts` |
| `service.ts` | Business logic, database queries, transaction management | `schema.ts`, `types.ts`, other modules' `public-api.ts` |
| `schema.ts` | Drizzle table definitions, indexes, constraints | `drizzle-orm`, shared schemas (tenants) |
| `types.ts` | Zod schemas for validation, TypeScript type exports | `zod` |
| `public-api.ts` | Functions exposed to other modules | `service.ts` |
| `index.ts` | Module registration, router export | `routes.ts` |

---

## 2. Inter-Module Communication

### 2.1 Public API Pattern

Modules communicate through explicit **Public API** functions, never through direct database queries:

```typescript
// modules/order/public-api.ts
export async function getOrderById(tenantId: string, orderId: string): Promise<Order | null> {
  return orderService.findById(tenantId, orderId);
}

export async function getOrdersByStoreId(tenantId: string, storeId: string): Promise<Order[]> {
  return orderService.findByStoreId(tenantId, storeId);
}

// modules/logistics/service.ts — CORRECT: uses order's public API
import { getOrderById } from '../order/public-api.js';

async function createShipment(tenantId: string, orderId: string, ...) {
  const order = await getOrderById(tenantId, orderId); // Through public API
  // ... shipment logic
}
```

### 2.2 Why Not Direct DB Queries?

```typescript
// WRONG: logistics module directly queries order table
import { orders } from '../order/schema.js';

async function createShipment(tenantId: string, orderId: string, ...) {
  const order = await db.select().from(orders).where(eq(orders.id, orderId)); // Direct DB query!
}
```

Problems with direct queries:
- **Couples modules** at the database level (schema changes ripple across modules)
- **Bypasses business logic** (validation, authorization, tenant isolation)
- **Breaks encapsulation** (caller needs to know internal table structure)
- **Makes testing harder** (can't mock at the service boundary)

---

## 3. Dependency Direction

### 3.1 Allowed Dependencies

```
Platform Engines (ebay/walmart/amazon/meli)
    ↓
Order ← Logistics ← Finance ← Accounting
    ↓         ↓
Product    Store
    ↓
Platform Data → Listing
```

### 3.2 Rules

1. **Lower modules don't know about higher modules** — `product` doesn't import from `order`
2. **Sibling modules communicate through public APIs** — `order` and `logistics` use each other's public-api.ts
3. **Platform engines are adapters** — they import from domain modules, not vice versa
4. **Shared schemas** (tenants, users) are in a separate `shared/` or root schema directory

---

## 4. Module Registration

### 4.1 Router Registration

```typescript
// src/app.ts
import { orderRouter } from './modules/order/index.js';
import { productRouter } from './modules/product/index.js';
import { logisticsRouter } from './modules/logistics/index.js';
import { financeRouter } from './modules/finance/index.js';
import { accountingRouter } from './modules/accounting/index.js';

const app = express();

// Each module owns its URL prefix
app.use('/api/orders', orderRouter);
app.use('/api/products', productRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/accounting', accountingRouter);
```

### 4.2 Module Index

```typescript
// modules/order/index.ts
import { Router } from 'express';
import { registerOrderRoutes } from './routes.js';

export const orderRouter = Router();
registerOrderRoutes(orderRouter);

// Re-export public API for other modules
export { getOrderById, getOrdersByStoreId } from './public-api.js';
```

---

## 5. Anti-Patterns

### 5.1 Cross-Module Direct DB Query

```typescript
// BAD: finance module directly queries order schema
import { orders } from '../../order/schema.js';
const order = await db.select().from(orders).where(...);
```

**Fix**: Use order module's public API.

### 5.2 Circular Dependencies

```typescript
// BAD: order imports from logistics, logistics imports from order
// modules/order/service.ts
import { getShipment } from '../logistics/public-api.js';

// modules/logistics/service.ts
import { getOrderById } from '../order/public-api.js';
```

**Fix**: If bidirectional communication is needed, use events (BullMQ) or a shared mediator service. Or refactor so one module provides a callback interface.

### 5.3 God Module

A module that handles too many responsibilities:

```
modules/core/           # BAD: everything in one module
├── order.service.ts
├── product.service.ts
├── shipping.service.ts
├── accounting.service.ts
└── ...
```

**Fix**: Split into focused modules with clear boundaries.

### 5.4 Leaky Abstractions

```typescript
// BAD: route handler contains business logic
router.post('/orders/:id/ship', async (req, res) => {
  const order = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (order.status !== 'approved') return res.status(400).json({ error: 'Not approved' });
  await db.update(orders).set({ status: 'shipped' }).where(eq(orders.id, req.params.id));
  await ebayClient.createShippingFulfillment(order.platformOrderId, ...);
  res.json({ ok: true });
});
```

**Fix**: Route handler should only call `service.shipOrder(orderId, trackingInfo)`.

---

## 6. Transaction Boundaries

### 6.1 Single-Module Transactions

```typescript
// service.ts — transaction within one module
async function createOrderWithItems(tenantId: string, data: CreateOrderInput) {
  return db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values({ tenantId, ...data.order }).returning();
    const items = data.items.map(item => ({ ...item, orderId: order.id, tenantId }));
    await tx.insert(orderItems).values(items);
    return order;
  });
}
```

### 6.2 Cross-Module Coordination

When multiple modules need to be updated atomically:

**Option A: Saga pattern** (recommended for async operations)
```
1. Order module: mark order as processing
2. Logistics module: create shipment (may fail)
3. If shipment fails → Order module: revert status
```

**Option B: Shared transaction** (for synchronous, same-DB operations)
```typescript
// Pass transaction to other module's public API
async function processOrder(tx: Transaction, tenantId: string, orderId: string) {
  await updateOrderStatus(tx, orderId, 'processing');
  await createInventoryReservation(tx, orderId, items);
  await createJournalEntry(tx, tenantId, orderConfirmedEntry);
}
```
