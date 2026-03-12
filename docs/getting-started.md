# Getting Started with ERPForge

> 从零搭建一个完整的"仓库管理模块"（Warehouse Module），约 30 分钟。

---

## Prerequisites

- **Node.js 22+**、**PostgreSQL 16+**、**Redis 7+**
- **Claude Code**（或 Cursor / Codex）已安装 ERPForge
- 一个已初始化的 TypeScript 项目

---

## What You'll Build

一个完整的仓库管理模块，包含：
- 仓库 CRUD（创建 / 读取 / 更新 / 删除）
- 库存管理（入库 / 出库 / 调整）
- 多租户数据隔离
- 前端列表页 + 详情页

---

## Step 1: Install ERPForge (2 min)

将 ERPForge 添加到你的 Claude Code 项目：

```bash
# 克隆 ERPForge 到本地
git clone https://github.com/yufakang0826-hue/erpforge.git

# 或者作为 Claude Code 技能安装
cd your-erp-project
# 将 erpforge 的 skills/ 和 knowledge/ 链接或复制到 .claude/ 目录
cp -r path/to/erpforge/skills/ .claude/skills/
cp -r path/to/erpforge/knowledge/ .claude/knowledge/
cp -r path/to/erpforge/templates/ .claude/templates/
cp -r path/to/erpforge/protocols/ .claude/protocols/
```

验证安装：
```bash
ls .claude/skills/
# 应该看到: erp-module-design.md, erp-data-model.md, ...
```

---

## Step 2: Design the Module (5 min)

使用 `erp-module-design` 技能设计仓库模块。在 Claude Code 中描述你的需求：

> "设计一个仓库管理模块，包含仓库表和库存表。"

### 数据模型

**warehouses 表**（仓库）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tenantId | UUID | 租户 ID（多租户隔离） |
| name | VARCHAR(500) | 仓库名称 |
| code | VARCHAR(100) | 仓库编码（租户内唯一） |
| address | TEXT | 仓库地址 |
| type | VARCHAR(30) | 仓库类型：domestic / overseas / fba |
| isActive | BOOLEAN | 是否启用 |

**inventory 表**（库存）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tenantId | UUID | 租户 ID |
| warehouseId | UUID | 所属仓库（外键） |
| sku | VARCHAR(200) | SKU 编码 |
| quantity | INTEGER | 实际库存数量 |
| reservedQuantity | INTEGER | 已预留数量（待发货） |

### API 设计

```
GET    /api/warehouses          — 仓库列表（分页 + 筛选）
POST   /api/warehouses          — 创建仓库
GET    /api/warehouses/:id      — 仓库详情
PATCH  /api/warehouses/:id      — 更新仓库
DELETE /api/warehouses/:id      — 删除仓库（软删除）

GET    /api/inventory           — 库存列表
POST   /api/inventory/adjust    — 库存调整（入库/出库）
```

### 状态定义

仓库状态：`active`（启用）| `inactive`（停用）

---

## Step 3: Scaffold Backend (5 min)

使用脚手架工具生成后端模块骨架：

```bash
./scripts/scaffold.sh backend-module warehouse ./src/modules/warehouse
```

输出：
```
ERPForge Scaffold
模板类型: backend-module
模块名称: warehouse
输出目录: ./src/modules/warehouse

创建: schema.ts
创建: service.ts
创建: routes.ts
创建: types.ts
创建: index.ts

成功创建 5 个文件:
  ✓ ./src/modules/warehouse/schema.ts
  ✓ ./src/modules/warehouse/service.ts
  ✓ ./src/modules/warehouse/routes.ts
  ✓ ./src/modules/warehouse/types.ts
  ✓ ./src/modules/warehouse/index.ts
```

---

## Step 4: Customize Schema (5 min)

打开 `./src/modules/warehouse/schema.ts`，将通用字段替换为仓库特有字段：

```typescript
// schema.ts — 仓库特有字段
export const warehouses = warehouseSchema.table('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  // 仓库核心字段
  name: varchar('name', { length: 500 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  address: text('address'),
  type: varchar('type', { length: 30 }).notNull().default('domestic'),
  // type: 'domestic' | 'overseas' | 'fba'

  isActive: boolean('is_active').notNull().default(true),

  // 软删除 + 审计
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_warehouses_tenant_code').on(table.tenantId, table.code),
  index('idx_warehouses_tenant_active').on(table.tenantId, table.isActive),
]);

// 库存表
export const inventory = warehouseSchema.table('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  sku: varchar('sku', { length: 200 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_inventory_warehouse_sku').on(table.tenantId, table.warehouseId, table.sku),
  index('idx_inventory_tenant_sku').on(table.tenantId, table.sku),
]);
```

同步修改 `types.ts`，添加仓库类型的 Zod 校验：

```typescript
// types.ts — 添加仓库类型字段
export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(500),
  code: z.string().min(1).max(100),
  address: z.string().optional(),
  type: z.enum(['domestic', 'overseas', 'fba']).default('domestic'),
  isActive: z.boolean().default(true),
});
```

---

## Step 5: Implement Business Logic (5 min)

在 `service.ts` 中添加库存调整逻辑：

```typescript
// service.ts — 库存调整（入库/出库）

interface AdjustInventoryInput {
  warehouseId: string;
  sku: string;
  adjustmentType: 'inbound' | 'outbound' | 'correction';
  quantity: number;  // 正数=入库，负数=出库
  reason?: string;
}

export async function adjustInventory(
  tenantId: string,
  input: AdjustInventoryInput,
): Promise<typeof inventory.$inferSelect> {
  return db.transaction(async (tx) => {
    // 1. 查找或创建库存记录
    let [record] = await tx.select()
      .from(inventory)
      .where(and(
        eq(inventory.tenantId, tenantId),
        eq(inventory.warehouseId, input.warehouseId),
        eq(inventory.sku, input.sku),
      ))
      .limit(1);

    if (!record && input.quantity > 0) {
      // 入库：创建新记录
      [record] = await tx.insert(inventory)
        .values({
          tenantId,
          warehouseId: input.warehouseId,
          sku: input.sku,
          quantity: input.quantity,
          reservedQuantity: 0,
        })
        .returning();
      return record;
    }

    if (!record) {
      throw new Error(`SKU ${input.sku} 在该仓库中不存在`);
    }

    // 2. 出库时检查可用库存
    if (input.quantity < 0) {
      const available = record.quantity - record.reservedQuantity;
      if (available + input.quantity < 0) {
        throw new Error(
          `库存不足: 可用 ${available}, 请求出库 ${Math.abs(input.quantity)}`
        );
      }
    }

    // 3. 更新库存数量
    const [updated] = await tx.update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${input.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, record.id))
      .returning();

    return updated;
  });
}
```

---

## Step 6: Scaffold Frontend (3 min)

生成前端列表页：

```bash
./scripts/scaffold.sh list-page warehouse ./frontend/src/pages/warehouse
```

输出：
```
创建: page.tsx
创建: filter-bar.tsx
创建: columns.tsx
创建: use-data.ts
```

生成的 `page.tsx` 已经包含：
- 筛选栏（搜索 + 状态筛选 + 重置）
- 数据表格（排序 + 分页）
- 加载和错误状态处理

如果还需要详情页：

```bash
./scripts/scaffold.sh detail-page warehouse ./frontend/src/pages/warehouse
```

根据仓库字段自定义 `columns.tsx`，添加仓库类型和地址列：

```typescript
// columns.tsx — 添加仓库特有列
export const columns: ColumnDef<WarehouseRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'code', header: 'Code' },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const labels = { domestic: 'Domestic', overseas: 'Overseas', fba: 'FBA' };
      return <Badge variant="outline">{labels[row.original.type]}</Badge>;
    },
  },
  { accessorKey: 'address', header: 'Address' },
  // ...status, createdAt, actions
];
```

---

## Step 7: Verify (5 min)

### 类型检查

```bash
npx tsc --noEmit
```

### API 测试

启动开发服务器后，用 curl 验证：

```bash
# 创建仓库
curl -X POST http://localhost:3000/api/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "深圳主仓",
    "code": "WH-SZ-001",
    "type": "domestic",
    "address": "广东省深圳市宝安区"
  }'

# 查询仓库列表
curl "http://localhost:3000/api/warehouses?page=1&pageSize=20"

# 库存入库
curl -X POST http://localhost:3000/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "<warehouse-id>",
    "sku": "WIDGET-001",
    "adjustmentType": "inbound",
    "quantity": 100,
    "reason": "采购入库"
  }'

# 查询库存
curl "http://localhost:3000/api/inventory?warehouseId=<warehouse-id>"
```

### 浏览器验证

打开 `http://localhost:5173/warehouses`，确认：
- 列表页正常加载
- 筛选功能正常
- 分页正常

### 多租户隔离检查（CC-3 Checklist）

确认以下几点：
- [ ] 每个数据库查询都包含 `tenantId` 过滤条件
- [ ] 创建记录时自动注入当前租户的 `tenantId`
- [ ] 唯一约束都是租户范围内的（如 `UNIQUE(tenant_id, code)`）
- [ ] 不存在跨租户数据泄露的可能

---

## What's Next

完成基础仓库模块后，可以继续扩展：

### 库存预警
当 `quantity < threshold` 时触发通知：
```typescript
// 在库存调整后检查
if (updated.quantity < threshold) {
  await notificationService.send({
    type: 'low_stock_alert',
    sku: input.sku,
    currentQuantity: updated.quantity,
    threshold,
  });
}
```

### 集成物流模块
发货时自动扣减库存：
```typescript
// 订单发货 → 扣减库存
await adjustInventory(tenantId, {
  warehouseId: order.warehouseId,
  sku: lineItem.sku,
  adjustmentType: 'outbound',
  quantity: -lineItem.quantity,
  reason: `订单发货: ${order.orderNo}`,
});
```

### 添加看板组件
```bash
./scripts/scaffold.sh dashboard-widget warehouse ./frontend/src/components/dashboard
```

生成 KPI 卡片和图表组件，展示库存概况、出入库趋势等数据。

---

## Further Reading

- `knowledge/domain/` — 领域知识（会计模型、物流模型、订单生命周期等）
- `knowledge/platforms/` — 平台集成模式（eBay、Amazon、Walmart、MercadoLibre）
- `templates/` — 所有模板的 README.md 包含详细的自定义指南
- `protocols/` — 开发协议和质量检查清单
