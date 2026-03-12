import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, '价格格式: 最多2位小数'),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
