import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { inventory } from '../../db/schema.js';
import { NotFoundError, BusinessError } from '../../lib/errors.js';
import type { AdjustInventoryInput, InitInventoryInput } from './types.js';

// 查询单个产品库存
export async function getInventory(tenantId: string, productId: string) {
  const [record] = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));

  if (!record) {
    throw new NotFoundError('库存记录', productId);
  }

  return record;
}

// 初始化库存记录
export async function initInventory(tenantId: string, input: InitInventoryInput) {
  // 检查是否已有库存记录
  const [existing] = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, input.productId),
    ));

  if (existing) {
    throw new BusinessError(`产品 ${input.productId} 的库存记录已存在`);
  }

  const [record] = await db
    .insert(inventory)
    .values({
      tenantId,
      productId: input.productId,
      sku: input.sku,
      quantity: input.quantity,
      reservedQuantity: 0,
    })
    .returning();

  return record;
}

// 调整库存数量
export async function adjustInventory(
  tenantId: string,
  productId: string,
  input: AdjustInventoryInput,
) {
  const record = await getInventory(tenantId, productId);

  const newQuantity = record.quantity + input.quantity;

  if (newQuantity < 0) {
    throw new BusinessError(
      `库存不足：当前 ${record.quantity}，调整 ${input.quantity}，结果不能为负数`,
    );
  }

  if (newQuantity < record.reservedQuantity) {
    throw new BusinessError(
      `调整后库存 (${newQuantity}) 不能小于已预留数量 (${record.reservedQuantity})`,
    );
  }

  const [updated] = await db
    .update(inventory)
    .set({
      quantity: newQuantity,
      updatedAt: new Date(),
    })
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ))
    .returning();

  return updated;
}

// 库存列表（可选低库存过滤）
export async function listInventory(
  tenantId: string,
  filters: { lowStock?: boolean; threshold?: number } = {},
) {
  const { lowStock, threshold = 10 } = filters;

  const conditions = [eq(inventory.tenantId, tenantId)];

  if (lowStock) {
    // 可用库存 = 总数 - 预留，低于阈值则告警
    conditions.push(
      sql`(${inventory.quantity} - ${inventory.reservedQuantity}) < ${threshold}`,
    );
  }

  const items = await db
    .select()
    .from(inventory)
    .where(and(...conditions))
    .orderBy(inventory.sku);

  return { items };
}

// === 以下为 Order Service 调用的库存操作 ===

// 预留库存（创建订单时调用）
export async function reserveStock(
  tenantId: string,
  productId: string,
  quantity: number,
  txDb?: typeof db,
) {
  const database = txDb ?? db;

  const [record] = await database
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));

  if (!record) {
    throw new BusinessError(`产品 ${productId} 无库存记录`);
  }

  const available = record.quantity - record.reservedQuantity;
  if (available < quantity) {
    throw new BusinessError(
      `库存不足：产品 ${productId} 可用 ${available}，需要 ${quantity}`,
    );
  }

  await database
    .update(inventory)
    .set({
      reservedQuantity: record.reservedQuantity + quantity,
      updatedAt: new Date(),
    })
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));
}

// 释放库存（取消订单时调用）
export async function releaseStock(
  tenantId: string,
  productId: string,
  quantity: number,
  txDb?: typeof db,
) {
  const database = txDb ?? db;

  const [record] = await database
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));

  if (!record) {
    throw new BusinessError(`产品 ${productId} 无库存记录`);
  }

  await database
    .update(inventory)
    .set({
      reservedQuantity: Math.max(0, record.reservedQuantity - quantity),
      updatedAt: new Date(),
    })
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));
}

// 确认扣减库存（订单进入 processing 时调用）
export async function deductStock(
  tenantId: string,
  productId: string,
  quantity: number,
  txDb?: typeof db,
) {
  const database = txDb ?? db;

  const [record] = await database
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));

  if (!record) {
    throw new BusinessError(`产品 ${productId} 无库存记录`);
  }

  await database
    .update(inventory)
    .set({
      quantity: record.quantity - quantity,
      reservedQuantity: record.reservedQuantity - quantity,
      updatedAt: new Date(),
    })
    .where(and(
      eq(inventory.tenantId, tenantId),
      eq(inventory.productId, productId),
    ));
}
