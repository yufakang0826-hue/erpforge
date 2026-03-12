/**
 * Module Service Template — Business Logic Layer
 *
 * Replace {{MODULE}} and {{module}} with your module name.
 *
 * Features:
 * - tenantId filtering on every query (multi-tenant)
 * - Transaction support for multi-table writes
 * - Soft delete
 * - Pagination with total count
 * - Error handling
 */
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { {{module}}s } from './schema.js';
import type {
  Create{{MODULE}}Input,
  Update{{MODULE}}Input,
  List{{MODULE}}sFilter,
  PaginatedResponse,
  {{MODULE}},
} from './types.js';

// ─── List (Paginated + Filtered) ──────────────────────────

export async function list{{MODULE}}s(
  tenantId: string,
  filters: List{{MODULE}}sFilter,
): Promise<PaginatedResponse<typeof {{module}}s.$inferSelect>> {
  const { page, pageSize, status, search, sortBy, sortOrder } = filters;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [
    eq({{module}}s.tenantId, tenantId),
    eq({{module}}s.isDeleted, false),
  ];

  if (status) {
    conditions.push(eq({{module}}s.status, status));
  }

  if (search) {
    conditions.push(like({{module}}s.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  // Sort direction
  const orderFn = sortOrder === 'asc' ? asc : desc;
  const orderColumn = {{module}}s[sortBy] ?? {{module}}s.createdAt;

  // Parallel: fetch items + count
  const [items, countResult] = await Promise.all([
    db.select()
      .from({{module}}s)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .offset(offset)
      .limit(pageSize),
    db.select({ count: sql<number>`count(*)::int` })
      .from({{module}}s)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Get by ID ────────────────────────────────────────────

export async function get{{MODULE}}ById(
  tenantId: string,
  id: string,
): Promise<typeof {{module}}s.$inferSelect | null> {
  const rows = await db.select()
    .from({{module}}s)
    .where(and(
      eq({{module}}s.tenantId, tenantId),
      eq({{module}}s.id, id),
      eq({{module}}s.isDeleted, false),
    ))
    .limit(1);

  return rows[0] ?? null;
}

// ─── Create ───────────────────────────────────────────────

export async function create{{MODULE}}(
  tenantId: string,
  input: Create{{MODULE}}Input,
  createdBy?: string,
): Promise<typeof {{module}}s.$inferSelect> {
  const [created] = await db.insert({{module}}s)
    .values({
      tenantId,
      ...input,
      createdBy: createdBy ?? null,
    })
    .returning();

  return created;
}

// ─── Update ───────────────────────────────────────────────

export async function update{{MODULE}}(
  tenantId: string,
  id: string,
  input: Update{{MODULE}}Input,
): Promise<typeof {{module}}s.$inferSelect | null> {
  const rows = await db.update({{module}}s)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(
      eq({{module}}s.tenantId, tenantId),
      eq({{module}}s.id, id),
      eq({{module}}s.isDeleted, false),
    ))
    .returning();

  return rows[0] ?? null;
}

// ─── Soft Delete ──────────────────────────────────────────

export async function delete{{MODULE}}(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const rows = await db.update({{module}}s)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq({{module}}s.tenantId, tenantId),
      eq({{module}}s.id, id),
      eq({{module}}s.isDeleted, false),
    ))
    .returning();

  return rows.length > 0;
}

// ─── Transaction Example ──────────────────────────────────

/**
 * Example of a multi-table write using a transaction.
 * Uncomment and adapt when you need atomic operations.
 */
// export async function create{{MODULE}}WithRelated(
//   tenantId: string,
//   input: Create{{MODULE}}Input & { relatedItems: CreateRelatedInput[] },
// ) {
//   return db.transaction(async (tx) => {
//     const [parent] = await tx.insert({{module}}s)
//       .values({ tenantId, ...input })
//       .returning();
//
//     const childRows = input.relatedItems.map(item => ({
//       tenantId,
//       parentId: parent.id,
//       ...item,
//     }));
//     await tx.insert(relatedTable).values(childRows);
//
//     return parent;
//   });
// }
