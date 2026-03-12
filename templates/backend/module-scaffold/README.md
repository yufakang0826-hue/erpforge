# Backend Module Scaffold

A complete, production-ready template for a backend CRUD module using Express + Drizzle ORM + Zod.

## How to Use

1. **Copy** this directory to `src/modules/{your-module-name}/`

2. **Replace placeholders** in all files:
   - `{{MODULE}}` → PascalCase name (e.g., `Product`, `Carrier`, `Warehouse`)
   - `{{module}}` → camelCase/lowercase name (e.g., `product`, `carrier`, `warehouse`)

3. **Customize the schema** (`schema.ts`):
   - Replace the example fields (`name`, `code`, `description`) with your domain fields
   - Add appropriate indexes and constraints

4. **Customize the types** (`types.ts`):
   - Update Zod schemas to match your domain model
   - Add/remove fields from create/update/filter schemas

5. **Customize the service** (`service.ts`):
   - Add business logic beyond basic CRUD
   - Add transaction-based operations if needed

6. **Register the router** in your main app:
   ```typescript
   import { {{module}}Router } from './modules/{{module}}/index.js';
   app.use('/api/{{module}}s', {{module}}Router);
   ```

7. **Generate migration**:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

## File Overview

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle ORM table definitions with tenantId, soft delete, timestamps |
| `types.ts` | Zod validation schemas + TypeScript types for create/update/list |
| `service.ts` | Business logic: CRUD operations with tenant isolation |
| `routes.ts` | Express routes: GET (list/detail), POST, PUT, DELETE |
| `index.ts` | Module entry point: exports router and public API |

## Features Included

- **Multi-tenant**: Every query filters by `tenantId`
- **Soft delete**: `isDeleted` + `deletedAt` instead of hard delete
- **Pagination**: Page-based with total count
- **Filtering**: Status filter + text search
- **Sorting**: Configurable sort field and direction
- **Validation**: Zod schemas for all inputs
- **Error handling**: Consistent error responses
- **Type safety**: End-to-end TypeScript types
