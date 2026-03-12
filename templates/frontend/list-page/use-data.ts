/**
 * Data Fetching Hook Template — TanStack Query
 *
 * Replace {{Module}} and {{module}} with your module name.
 *
 * Features:
 * - Typed filters and response
 * - Automatic refetch on filter change
 * - Loading, error, and refetch states
 * - Cache key includes all filter params
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────

export interface {{Module}}Filters {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface {{Module}}Item {
  id: string;
  name: string;
  code: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── API Functions ────────────────────────────────────────

const API_BASE = '/api/{{module}}s';

async function fetch{{Module}}List(
  filters: {{Module}}Filters,
): Promise<PaginatedResponse<{{Module}}Item>> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch {{module}}s: ${response.status}`);
  }
  return response.json();
}

async function fetch{{Module}}ById(id: string): Promise<{{Module}}Item> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch {{module}}: ${response.status}`);
  }
  return response.json();
}

async function delete{{Module}}(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to delete {{module}}: ${response.status}`);
  }
}

// ─── Query Hooks ──────────────────────────────────────────

/**
 * Fetch paginated list of {{module}}s with filters.
 */
export function use{{Module}}List(filters: {{Module}}Filters) {
  return useQuery({
    queryKey: ['{{module}}s', 'list', filters],
    queryFn: () => fetch{{Module}}List(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Fetch a single {{module}} by ID.
 */
export function use{{Module}}Detail(id: string | undefined) {
  return useQuery({
    queryKey: ['{{module}}s', 'detail', id],
    queryFn: () => fetch{{Module}}ById(id!),
    enabled: !!id, // Don't fetch if no ID
  });
}

// ─── Mutation Hooks ───────────────────────────────────────

/**
 * Delete a {{module}} and invalidate the list cache.
 */
export function useDelete{{Module}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: delete{{Module}},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{{module}}s', 'list'] });
    },
  });
}
