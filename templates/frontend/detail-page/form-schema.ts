/**
 * Form Validation Schema Template — Zod
 *
 * Replace {{Module}} and {{module}} with your module name.
 *
 * Shared between frontend form validation and backend API validation.
 * Keep this in sync with your backend types.ts.
 */
import { z } from 'zod';

// ─── Form Schema ──────────────────────────────────────────

export const {{module}}FormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(500, 'Name must be 500 characters or less'),

  code: z.string()
    .max(100, 'Code must be 100 characters or less')
    .optional()
    .or(z.literal('')),

  status: z.enum(['active', 'inactive', 'archived'], {
    required_error: 'Status is required',
  }),

  description: z.string()
    .max(5000, 'Description must be 5000 characters or less')
    .optional()
    .or(z.literal('')),
});

export type {{Module}}FormValues = z.infer<typeof {{module}}FormSchema>;

// ─── Validation Helpers ───────────────────────────────────

/**
 * Validate a single field programmatically.
 * Useful for async validation (e.g., checking uniqueness).
 */
export function validate{{Module}}Field(
  field: keyof {{Module}}FormValues,
  value: unknown,
): string | null {
  const result = {{module}}FormSchema.shape[field].safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Invalid value';
}
