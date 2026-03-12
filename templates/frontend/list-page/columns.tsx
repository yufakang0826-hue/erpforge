/**
 * Table Columns Template — TanStack Table Column Definitions
 *
 * Replace {{Module}} and {{module}} with your module name.
 *
 * Features:
 * - Sortable columns
 * - Formatted dates and amounts
 * - Status badges
 * - Action buttons
 */
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

export interface {{Module}}Row {
  id: string;
  name: string;
  code: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ─── Status Badge Variants ────────────────────────────────

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  archived: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

// ─── Column Definitions ───────────────────────────────────

export const columns: ColumnDef<{{Module}}Row>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-sm">
        {row.original.code ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
    filterFn: 'equals',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="size-8 p-0">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleView(row.original.id)}>
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEdit(row.original.id)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a monetary amount with currency symbol.
 * Useful for order/finance columns.
 */
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Action Handlers (replace with your navigation/mutation logic) ──

function handleView(id: string) {
  // navigate(`/{{module}}s/${id}`);
  console.log('View', id);
}

function handleEdit(id: string) {
  // navigate(`/{{module}}s/${id}/edit`);
  console.log('Edit', id);
}

function handleDelete(id: string) {
  // openDeleteConfirmation(id);
  console.log('Delete', id);
}
