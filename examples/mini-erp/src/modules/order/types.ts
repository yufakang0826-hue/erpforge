import { z } from 'zod';

// 订单状态机 — 合法转换
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['approved', 'cancelled'],
  approved: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export const createOrderSchema = z.object({
  buyerName: z.string().min(1),
  buyerEmail: z.string().email().optional(),
  note: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const updateStatusSchema = z.object({
  status: z.string(),
  reason: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
