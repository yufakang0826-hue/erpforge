import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ========== 枚举 ==========

// 产品状态
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive']);

// 订单状态
export const orderStatusEnum = pgEnum('order_status', [
  'pending_review',
  'approved',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
]);

// ========== 产品表 ==========

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    status: productStatusEnum('status').notNull().default('active'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // SKU 在租户范围内唯一
    uniqueIndex('products_tenant_sku_idx').on(table.tenantId, table.sku),
  ],
);

// ========== 订单表 ==========

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    orderNumber: varchar('order_number', { length: 50 }).notNull(),
    status: orderStatusEnum('status').notNull().default('pending_review'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    buyerName: varchar('buyer_name', { length: 255 }),
    buyerEmail: varchar('buyer_email', { length: 255 }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 订单号在租户范围内唯一
    uniqueIndex('orders_tenant_order_number_idx').on(table.tenantId, table.orderNumber),
  ],
);

// ========== 订单明细表 ==========

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  sku: varchar('sku', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ========== 库存表 ==========

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sku: varchar('sku', { length: 100 }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 产品在租户范围内唯一
    uniqueIndex('inventory_tenant_product_idx').on(table.tenantId, table.productId),
  ],
);
