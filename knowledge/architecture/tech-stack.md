# Technology Stack — Recommended & Rationale

> Recommended technology choices for building a cross-border e-commerce ERP, with rationale and alternatives.

---

## 1. Recommended Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript** | 5.x (strict mode) | Primary language — type safety across full stack |
| **Node.js** | 22 LTS | Runtime — modern ESM support, performance |
| **Express** | 4.x / 5.x | HTTP framework — battle-tested, middleware ecosystem |
| **Drizzle ORM** | 0.36+ | Database ORM — type-safe queries, migration management |
| **PostgreSQL** | 16+ | Primary database — JSONB, RLS, excellent performance |
| **BullMQ** | 5.x | Job queue — scheduled tasks, background processing |
| **Redis** | 7.x | Cache + BullMQ backend — session cache, rate limit counters |
| **Zod** | 3.x | Runtime validation — API input validation, type inference |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19 | UI framework — component model, ecosystem |
| **Tailwind CSS** | v4 | Styling — utility-first, rapid development |
| **shadcn/ui** | latest | Component library — customizable, accessible |
| **Vite** | 6.x | Build tool — fast HMR, optimized builds |
| **TanStack Query** | 5.x | Data fetching — caching, refetch, optimistic updates |
| **React Hook Form** | 7.x | Forms — performance, validation integration |
| **Recharts** | 2.x | Charts — composable, responsive |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Nginx** | Reverse proxy, static file serving |
| **GitHub Actions** | CI/CD |
| **S3-compatible** | File/image storage (MinIO for self-hosted) |

---

## 2. Selection Rationale

### 2.1 TypeScript strict mode

**Why**: Catches bugs at compile time. Full-stack type sharing between backend and frontend. Zod + Drizzle provide end-to-end type safety from database to API response.

**Alternative**: Python (Django/FastAPI) — viable but loses full-stack type sharing.

### 2.2 Express over Fastify/Hono/Nest

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **Express** | Massive ecosystem, proven, simple middleware model | Slower than Fastify, callback-based | **Chosen** — reliability > raw speed for ERP |
| Fastify | Fast, schema validation | Smaller ecosystem, plugin model learning curve | Good alternative |
| Hono | Ultra-fast, modern | Young, smaller community | Too new for production ERP |
| NestJS | Structured, DI, decorators | Heavy abstractions, verbose, opinionated | Over-engineered for this use case |

### 2.3 Drizzle ORM over Prisma/TypeORM

| ORM | Pros | Cons | Verdict |
|-----|------|------|---------|
| **Drizzle** | SQL-like API, lightweight, great type inference | Younger project | **Chosen** — best DX for complex queries |
| Prisma | Popular, great docs, studio UI | Heavy client generation, limited raw SQL | Good for simpler apps |
| TypeORM | Feature-rich, decorators | Buggy, poor TypeScript support | Not recommended |
| Knex | Thin query builder | No type safety, manual migrations | Insufficient |

### 2.4 PostgreSQL over MySQL/MongoDB

| Database | Pros | Cons | Verdict |
|----------|------|------|---------|
| **PostgreSQL** | JSONB, RLS, schemas, advanced indexing | Slightly more complex setup | **Chosen** — enterprise features needed |
| MySQL | Simple, fast reads | No JSONB, no RLS, no schemas | Insufficient for multi-tenant ERP |
| MongoDB | Flexible schema, good for documents | No transactions (historically), no relations | Wrong model for accounting/ERP |

### 2.5 BullMQ over Agenda/node-cron

| Queue | Pros | Cons | Verdict |
|-------|------|------|---------|
| **BullMQ** | Redis-backed, reliable, repeatable jobs, rate limiting | Requires Redis | **Chosen** — production-grade job processing |
| Agenda | MongoDB-backed, simple | Less features, slower | Not recommended |
| node-cron | Zero dependencies | In-process only, no persistence, no retry | Toy-grade, not for production |

### 2.6 shadcn/ui over Ant Design/Material UI

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **shadcn/ui** | Customizable (copy into project), Tailwind-native, accessible | Fewer out-of-box components | **Chosen** — maximum control over design |
| Ant Design | Rich components, enterprise-focused | Opinionated styling, hard to customize | Heavy, fights against Tailwind |
| Material UI | Popular, well-documented | Material Design lock-in, large bundle | Wrong aesthetic for ERP |

---

## 3. Configuration Standards

### 3.1 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 3.2 ESM Only

```json
// package.json
{
  "type": "module"
}
```

- **No `require()`** — ESM `import/export` only
- File extensions in imports: `.js` (even for `.ts` files in backend)
- `__dirname` replacement: `import.meta.url`

### 3.3 Coding Standards

- **No `as any`** — use proper types or `unknown` + type guards
- **No `@ts-ignore` / `@ts-expect-error`** — fix the type error instead
- **No empty `catch`** — always log or rethrow
- **Multi-table writes must be in transactions** — data consistency is non-negotiable
- **All amounts: NUMERIC(19,4)** — no floating point for money

---

## 4. Development Environment

### 4.1 Required Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: erp
      POSTGRES_USER: erp
      POSTGRES_PASSWORD: erp_dev
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 4.2 Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && node dist/server.js",
    "test": "vitest",
    "db:migrate": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  }
}
```
