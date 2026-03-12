# Code Templates

Production-ready code templates for common ERP patterns. Copy, replace placeholders, and customize.

## Structure

```
templates/
├── backend/
│   ├── module-scaffold/       # Complete CRUD module (Express + Drizzle + Zod)
│   │   ├── schema.ts          # Database table definition
│   │   ├── types.ts           # Zod validation + TypeScript types
│   │   ├── service.ts         # Business logic with tenant isolation
│   │   ├── routes.ts          # Express CRUD routes
│   │   ├── index.ts           # Module entry point
│   │   └── README.md
│   └── platform-engine/       # Platform integration engine
│       ├── base-engine.ts     # Abstract PlatformEngine + Registry
│       ├── oauth-client.ts    # OAuth2 client (auth code + client credentials)
│       ├── api-client.ts      # HTTP client with retry + circuit breaker
│       ├── field-mapper.ts    # Platform ↔ internal field mapping
│       ├── sync-worker.ts     # BullMQ sync worker with reentrancy guard
│       └── README.md
└── frontend/
    ├── list-page/             # Data table page with filters
    │   ├── page.tsx           # Main page component
    │   ├── columns.tsx        # Table column definitions
    │   ├── filter-bar.tsx     # Filter controls
    │   ├── use-data.ts        # TanStack Query hooks
    │   └── README.md
    ├── detail-page/           # Detail/edit page with tabs
    │   ├── page.tsx           # Tab layout + form
    │   ├── form-schema.ts     # Zod form validation
    │   └── README.md
    └── dashboard-widget/      # Dashboard components
        ├── kpi-card.tsx       # KPI card with animation + trend
        ├── chart-card.tsx     # Chart wrapper (line/bar/area)
        └── README.md
```

## Placeholder Convention

All templates use `{{Module}}` (PascalCase) and `{{module}}` (camelCase) as placeholders:

```
{{Module}} → Order, Product, Carrier, Warehouse, etc.
{{module}} → order, product, carrier, warehouse, etc.
```

## Built-in Features

Every template includes these enterprise-grade features:

- **Multi-tenant**: `tenantId` on every table and query
- **Type safety**: Zod validation + TypeScript inference end-to-end
- **Soft delete**: `isDeleted` + `deletedAt` (no hard deletes)
- **Pagination**: Page-based with total count
- **Error handling**: Consistent error responses
