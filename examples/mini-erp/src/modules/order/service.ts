import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { orders, orderItems, products } from '../../db/schema.js';
import { NotFoundError, BusinessError } from '../../lib/errors.js';
import { reserveStock, releaseStock, deductStock } from '../inventory/service.js';
import { ORDER_TRANSITIONS } from './types.js';
import type { CreateOrderInput } from './types.js';

// 生成订单编号：ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000).toString();
  return `ORD-${date}-${rand}`;
}

// 订单列表（分页，包含 orderItems）
export async function listOrders(
  tenantId: string,
  filters: { status?: string; page?: number; pageSize?: number } = {},
) {
  const { status, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(orders.tenantId, tenantId)];
  if (status) {
    conditions.push(eq(orders.status, status));
  }

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(...conditions))
      .limit(pageSize)
      .offset(offset)
      .orderBy(orders.createdAt),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(...conditions)),
  ]);

  // 批量查询订单明细
  const orderIds = items.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))
    : [];

  // 按 orderId 分组
  const itemsByOrder = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const ordersWithItems = items.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));

  return {
    items: ordersWithItems,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

// 获取单个订单（含明细）
export async function getOrder(tenantId: string, id: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));

  if (!order) {
    throw new NotFoundError('订单', id);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return { ...order, items };
}

// 创建订单（事务操作）
export async function createOrder(tenantId: string, input: CreateOrderInput) {
  return await db.transaction(async (tx) => {
    // 1. 验证所有 productId 存在且属于该租户，并获取价格
    const productIds = input.items.map((i) => i.productId);
    const productRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        price: products.price,
      })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.isDeleted, false),
        inArray(products.id, productIds),
      ));

    // 检查是否所有产品都找到
    const productMap = new Map(productRows.map((p) => [p.id, p]));
    for (const item of input.items) {
      if (!productMap.has(item.productId)) {
        throw new BusinessError(`产品 ${item.productId} 不存在或已删除`);
      }
    }

    // 2. 检查库存并预留
    for (const item of input.items) {
      await reserveStock(tenantId, item.productId, item.quantity, tx);
    }

    // 3. 创建订单
    const orderNumber = generateOrderNumber();
    const [order] = await tx
      .insert(orders)
      .values({
        tenantId,
        orderNumber,
        status: 'pending_review',
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail ?? null,
        note: input.note ?? null,
        totalAmount: '0', // 稍后更新
      })
      .returning();

    // 4. 创建订单明细，计算总金额
    let totalAmount = 0;
    const itemValues = input.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.price;
      const subtotal = (parseFloat(unitPrice) * item.quantity).toFixed(2);
      totalAmount += parseFloat(subtotal);

      return {
        tenantId,
        orderId: order.id,
        productId: item.productId,
        sku: product.sku,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    await tx.insert(orderItems).values(itemValues);

    // 5. 更新订单总金额
    const [updatedOrder] = await tx
      .update(orders)
      .set({ totalAmount: totalAmount.toFixed(2) })
      .where(eq(orders.id, order.id))
      .returning();

    // 查询创建的明细返回
    const createdItems = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    return { ...updatedOrder, items: createdItems };
  });
}

// 更新订单状态（状态机校验）
export async function updateOrderStatus(
  tenantId: string,
  id: string,
  newStatus: string,
  reason?: string,
) {
  const order = await getOrder(tenantId, id);
  const currentStatus = order.status;

  // 状态机验证
  const allowedTargets = ORDER_TRANSITIONS[currentStatus];
  if (!allowedTargets) {
    throw new BusinessError(`未知的订单状态: ${currentStatus}`);
  }

  if (!allowedTargets.includes(newStatus)) {
    throw new BusinessError(
      `订单状态不能从 "${currentStatus}" 转为 "${newStatus}"，合法目标: [${allowedTargets.join(', ')}]`,
    );
  }

  return await db.transaction(async (tx) => {
    // 取消订单 → 释放库存
    if (newStatus === 'cancelled') {
      for (const item of order.items) {
        await releaseStock(tenantId, item.productId, item.quantity, tx);
      }
    }

    // 进入 processing → 确认扣减库存
    if (newStatus === 'processing') {
      for (const item of order.items) {
        await deductStock(tenantId, item.productId, item.quantity, tx);
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: newStatus,
        note: reason ? `${order.note ?? ''}${order.note ? ' | ' : ''}${reason}` : order.note,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .returning();

    return updated;
  });
}
