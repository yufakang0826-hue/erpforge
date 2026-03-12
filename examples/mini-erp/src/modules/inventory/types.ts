import { z } from 'zod';

export const adjustInventorySchema = z.object({
  quantity: z.number().int(), // 正数增加，负数减少
  reason: z.string().min(1),
});

export const initInventorySchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1),
  quantity: z.number().int().nonnegative(),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type InitInventoryInput = z.infer<typeof initInventorySchema>;
