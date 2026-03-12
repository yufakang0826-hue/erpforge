/**
 * Module Schema Template — Drizzle ORM
 *
 * Replace {{MODULE}} and {{module}} with your module name.
 * Example: MODULE = "Product", module = "product"
 *
 * Features:
 * - Multi-tenant (tenantId on every table)
 * - Soft delete (isDeleted + deletedAt)
 * - Timestamps (createdAt, updatedAt)
 * - Proper indexes and unique constraints
 */
import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  integer,
  numeric,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from '../saas.schema.js';

// Use a dedicated PostgreSQL schema for module isolation
export const {{module}}Schema = pgSchema('{{module}}');

// ─── {{MODULE}}s (Main Table) ─────────────────────────────
export const {{module}}s = {{module}}Schema.table('{{module}}s', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  // Core fields — customize these for your module
  name: varchar('name', { length: 500 }).notNull(),
  code: varchar('code', { length: 100 }),
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('active'),

  // Metadata
  metadata: jsonb('metadata'),

  // Soft delete
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Audit
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Tenant-scoped unique constraint (adjust fields as needed)
  uniqueIndex('uq_{{module}}s_tenant_code').on(table.tenantId, table.code),
  // Common query indexes
  index('idx_{{module}}s_tenant_status').on(table.tenantId, table.status),
  index('idx_{{module}}s_created_at').on(table.createdAt),
]);
