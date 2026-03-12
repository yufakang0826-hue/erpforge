/**
 * Module Types Template — Zod Validation + TypeScript Types
 *
 * Replace {{MODULE}} and {{module}} with your module name.
 *
 * Pattern:
 * - Define Zod schemas for validation
 * - Infer TypeScript types from Zod schemas
 * - Export both for use in routes (validation) and services (typing)
 */
import { z } from 'zod';

// ─── Core Schema ──────────────────────────────────────────

export const {{module}}Schema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(500),
  code: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type {{MODULE}} = z.infer<typeof {{module}}Schema>;

// ─── Create Input ─────────────────────────────────────────

export const create{{MODULE}}Schema = z.object({
  name: z.string().min(1).max(500),
  code: z.string().max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Create{{MODULE}}Input = z.infer<typeof create{{MODULE}}Schema>;

// ─── Update Input ─────────────────────────────────────────

export const update{{MODULE}}Schema = z.object({
  name: z.string().min(1).max(500).optional(),
  code: z.string().max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Update{{MODULE}}Input = z.infer<typeof update{{MODULE}}Schema>;

// ─── List Filters ─────────────────────────────────────────

export const list{{MODULE}}sFilterSchema = z.object({
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type List{{MODULE}}sFilter = z.infer<typeof list{{MODULE}}sFilterSchema>;

// ─── API Response Types ───────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
