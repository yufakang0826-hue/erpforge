/**
 * List Page Template — React + shadcn/ui + TanStack Query
 *
 * Replace {{Module}} and {{module}} with your module name.
 * Example: Module = "Order", module = "order"
 *
 * Features:
 * - Filter bar (search, status, date range, reset)
 * - Data table with sorting
 * - Pagination
 * - Loading and error states
 * - Responsive layout
 */
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FilterBar } from './filter-bar';
import { columns } from './columns';
import { use{{Module}}List } from './use-data';
import type { {{Module}}Filters } from './use-data';

export default function {{Module}}ListPage() {
  const [filters, setFilters] = useState<{{Module}}Filters>({
    page: 1,
    pageSize: 20,
  });

  const { data, isLoading, isError, error, refetch } = use{{Module}}List(filters);

  const handleFilterChange = (newFilters: Partial<{{Module}}Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  const handleReset = () => {
    setFilters({ page: 1, pageSize: 20 });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{{Module}}s</h1>
        {/* Optional: Add action buttons here */}
        {/* <Button onClick={() => navigate('/{{module}}s/new')}>Create {{Module}}</Button> */}
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onSearch={() => refetch()}
      />

      {/* Error State */}
      {isError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load data: {error?.message ?? 'Unknown error'}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {((data.page - 1) * data.pageSize) + 1} - {Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => handlePageChange(data.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => handlePageChange(data.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
