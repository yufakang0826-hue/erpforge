/**
 * Filter Bar Template — shadcn/ui Components
 *
 * Replace {{Module}} and {{module}} with your module name.
 *
 * Layout: flex items-center gap-2 mb-3
 * All controls: h-8 (compact)
 * Right-side actions: ml-auto
 *
 * Components:
 * - Search input
 * - Status select
 * - Date range picker (optional)
 * - Search button
 * - Reset button
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';
import type { {{Module}}Filters } from './use-data';

interface FilterBarProps {
  filters: {{Module}}Filters;
  onFilterChange: (filters: Partial<{{Module}}Filters>) => void;
  onReset: () => void;
  onSearch: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset, onSearch }: FilterBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Search Input */}
      <Input
        placeholder="Search by name..."
        value={filters.search ?? ''}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        onKeyDown={handleKeyDown}
        className="h-8 w-60"
      />

      {/* Status Filter */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) =>
          onFilterChange({ status: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="h-8 w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Picker (uncomment and adapt if needed) */}
      {/* <DateRangePicker
        size="sm"
        value={filters.dateRange}
        onChange={(range) => onFilterChange({ dateRange: range })}
      /> */}

      {/* Right-side actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Search Button */}
        <Button size="sm" onClick={onSearch}>
          <Search className="size-4" />
        </Button>

        {/* Reset Button */}
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
