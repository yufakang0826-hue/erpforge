# List Page Template

A complete list page with filter bar, data table, and pagination using React + shadcn/ui + TanStack Query.

## How to Use

1. **Copy** this directory to `src/pages/{your-module}/`

2. **Replace placeholders** in all files:
   - `{{Module}}` → PascalCase name (e.g., `Order`, `Product`, `Carrier`)
   - `{{module}}` → camelCase name (e.g., `order`, `product`, `carrier`)

3. **Customize columns** (`columns.tsx`):
   - Update the `{{Module}}Row` interface to match your API response
   - Add/remove columns as needed
   - Customize formatters (dates, amounts, badges)

4. **Customize filters** (`filter-bar.tsx`):
   - Add/remove filter controls
   - Update status options
   - Add date range picker if needed

5. **Customize data hook** (`use-data.ts`):
   - Update `{{Module}}Item` interface
   - Update API base URL
   - Add more query/mutation hooks as needed

6. **Register route**:
   ```tsx
   <Route path="/{{module}}s" element={<{{Module}}ListPage />} />
   ```

## Component Architecture

```
{{Module}}ListPage (page.tsx)
├── FilterBar (filter-bar.tsx)
│   ├── Input (search)
│   ├── Select (status filter)
│   ├── Button (search)
│   └── Button (reset)
├── DataTable (columns.tsx)
│   ├── Column definitions
│   ├── Status badges
│   └── Action dropdown
└── Pagination controls
```

## UI Standards

- Filter bar: `flex items-center gap-2 mb-3`, all controls `h-8`
- Search button: default variant + `size="sm"` + `Search` icon
- Reset button: `variant="outline"` + `size="sm"` + `RotateCcw` icon
- Right-side actions: `ml-auto`
