import { eq, and, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { products } from '../../db/schema.js';
import { NotFoundError, BusinessError } from '../../lib/errors.js';
import type { CreateProductInput, UpdateProductInput } from './types.js';

// 产品列表（分页 + 搜索 + 状态过滤）
export async function listProducts(
  tenantId: string,
  filters: { status?: string; search?: string; page?: number; pageSize?: number } = {},
) {
  const { status, search, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  const conditions = [
    eq(products.tenantId, tenantId),
    eq(products.isDeleted, false),
  ];

  if (status) {
    conditions.push(eq(products.status, status));
  }
  if (search) {
    conditions.push(ilike(products.name, `%${search}%`));
  }

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset)
      .orderBy(products.createdAt),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

// 获取单个产品
export async function getProduct(tenantId: string, id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      eq(products.tenantId, tenantId),
      eq(products.isDeleted, false),
    ));

  if (!product) {
    throw new NotFoundError('产品', id);
  }

  return product;
}

// 创建产品
export async function createProduct(tenantId: string, input: CreateProductInput) {
  // 检查 SKU 唯一性（同租户内）
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      eq(products.sku, input.sku),
      eq(products.isDeleted, false),
    ));

  if (existing) {
    throw new BusinessError(`SKU "${input.sku}" 已存在`);
  }

  const [product] = await db
    .insert(products)
    .values({
      tenantId,
      ...input,
    })
    .returning();

  return product;
}

// 更新产品
export async function updateProduct(tenantId: string, id: string, input: UpdateProductInput) {
  // 先确认产品存在
  await getProduct(tenantId, id);

  // 如果更新了 SKU，检查唯一性
  if (input.sku) {
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.sku, input.sku),
        eq(products.isDeleted, false),
        sql`${products.id} != ${id}`,
      ));

    if (existing) {
      throw new BusinessError(`SKU "${input.sku}" 已存在`);
    }
  }

  const [updated] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .returning();

  return updated;
}

// 软删除产品
export async function deleteProduct(tenantId: string, id: string) {
  // 先确认产品存在
  await getProduct(tenantId, id);

  const [deleted] = await db
    .update(products)
    .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .returning();

  return deleted;
}
