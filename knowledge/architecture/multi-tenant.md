# Multi-Tenant Architecture

> Defines the multi-tenancy model using shared schema with tenant_id and Row-Level Security (RLS).

---

## 1. Strategy: Shared Schema + tenantId + RLS

### 1.1 Why Shared Schema?

| Strategy | Pros | Cons |
|----------|------|------|
| **Database per tenant** | Complete isolation | Expensive, hard to manage at scale |
| **Schema per tenant** | Good isolation | Complex migrations, connection pooling issues |
| **Shared schema + RLS** | Simple, cost-effective, easy migrations | Must enforce tenantId everywhere |

For an ERP SaaS, **shared schema with RLS** provides the best balance of simplicity and isolation.

### 1.2 Core Principle

Every business table has a `tenant_id` column. Every query must filter by `tenant_id`. RLS provides a safety net at the database level.

---

## 2. Implementation

### 2.1 Tenant Table

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,   -- URL-friendly identifier
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | suspended | cancelled
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Adding tenantId to Business Tables

```typescript
// Drizzle ORM pattern
import { tenants } from './saas.schema.js';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  // ... other fields
});
```

### 2.3 Middleware: Auto-Inject tenantId

```typescript
// middleware/tenant.ts
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract tenantId from authenticated user's JWT
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Tenant context required' });
  }

  // Attach to request for use in services
  req.tenantId = tenantId;
  next();
}

// Usage in routes
router.get('/orders', tenantMiddleware, async (req, res) => {
  const orders = await orderService.list(req.tenantId, req.query);
  res.json(orders);
});
```

### 2.4 Service Layer: Always Filter by tenantId

```typescript
// service.ts — tenantId is ALWAYS the first parameter
class OrderService {
  async list(tenantId: string, filters: OrderFilters) {
    return db.select()
      .from(orders)
      .where(and(
        eq(orders.tenantId, tenantId),   // ALWAYS filter by tenant
        eq(orders.isDeleted, false),
        ...buildFilters(filters),
      ))
      .orderBy(desc(orders.createdAt));
  }

  async findById(tenantId: string, orderId: string) {
    return db.select()
      .from(orders)
      .where(and(
        eq(orders.tenantId, tenantId),   // ALWAYS
        eq(orders.id, orderId),
      ))
      .limit(1)
      .then(rows => rows[0] ?? null);
  }

  async create(tenantId: string, data: CreateOrderInput) {
    return db.insert(orders).values({
      tenantId,                          // ALWAYS set
      ...data,
    }).returning();
  }
}
```

---

## 3. Row-Level Security (RLS)

### 3.1 RLS Policy Template

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Policy: users can only see rows matching their tenant
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policy for INSERT: ensure tenantId matches
CREATE POLICY tenant_insert ON orders
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policy for UPDATE: can only update own tenant's rows
CREATE POLICY tenant_update ON orders
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policy for DELETE: can only delete own tenant's rows
CREATE POLICY tenant_delete ON orders
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 3.2 Setting Tenant Context Per-Request

```typescript
// In middleware or service layer, before queries
async function withTenantContext<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  await db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
  return fn();
}

// Usage
const orders = await withTenantContext(req.tenantId, () =>
  db.select().from(orders).where(eq(orders.status, 'PAID'))
);
```

### 3.3 Superuser Bypass

For admin operations (migrations, cross-tenant reporting):

```sql
-- Create a superuser role that bypasses RLS
CREATE ROLE erp_admin BYPASSRLS;

-- Application role respects RLS
CREATE ROLE erp_app NOINHERIT;
```

---

## 4. Tables Where tenantId Should Be Nullable

Some tables are system-level and don't belong to a specific tenant:

| Table | tenantId | Reason |
|-------|----------|--------|
| `tenants` | N/A (IS the tenant) | |
| `users` | Nullable | Super-admins aren't tenant-bound |
| `audit_log` | Nullable | System-level audit events |
| `system_config` | NULL | Global configuration |
| `exchange_rates` | Nullable | Shared rates (or per-tenant override) |
| `platform_config` | NULL | Platform connection settings |

All business tables (orders, products, listings, transactions, etc.) **must** have a non-null `tenantId`.

---

## 5. Verification

### 5.1 Test: Cross-Tenant Data Isolation

```typescript
describe('Tenant Isolation', () => {
  it('should not return orders from other tenants', async () => {
    // Create order for tenant A
    const orderA = await createOrder(tenantA.id, { ... });

    // Query as tenant B — should not find tenant A's order
    const result = await orderService.findById(tenantB.id, orderA.id);
    expect(result).toBeNull();
  });

  it('should not allow updating other tenant orders', async () => {
    const orderA = await createOrder(tenantA.id, { ... });

    // Attempt update as tenant B
    const updated = await orderService.update(tenantB.id, orderA.id, { status: 'cancelled' });
    expect(updated).toBeNull(); // Should fail silently or throw
  });
});
```

### 5.2 Audit: Scan for Missing tenantId Filters

```typescript
// Automated check: grep for queries without tenantId
// Run as a CI check to prevent accidental cross-tenant leaks
// Look for: db.select().from(X).where(...) patterns missing tenantId
```

---

## 6. Common Patterns

### 6.1 Soft Delete with Tenant

```typescript
const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // ...
});

// Service: always filter out deleted
async list(tenantId: string) {
  return db.select()
    .from(orders)
    .where(and(
      eq(orders.tenantId, tenantId),
      eq(orders.isDeleted, false),  // Never show deleted
    ));
}

// Soft delete
async delete(tenantId: string, orderId: string) {
  return db.update(orders)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(
      eq(orders.tenantId, tenantId),
      eq(orders.id, orderId),
    ));
}
```

### 6.2 Unique Constraints with Tenant

```typescript
// SKU must be unique WITHIN a tenant, not globally
export const products = pgTable('products', {
  tenantId: uuid('tenant_id').notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  // ...
}, (table) => [
  uniqueIndex('uq_products_tenant_sku').on(table.tenantId, table.sku),
]);
```

### 6.3 Pagination with Tenant

```typescript
async listPaginated(tenantId: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const [items, countResult] = await Promise.all([
    db.select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.isDeleted, false)))
      .orderBy(desc(orders.createdAt))
      .offset(offset)
      .limit(pageSize),
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.isDeleted, false))),
  ]);
  return { items, total: countResult[0].count, page, pageSize };
}
```
