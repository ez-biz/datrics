# InsightBase — Architecture & Technical Decisions

> This document captures all architecture decisions, patterns, and conventions for InsightBase.
> **Update this whenever you introduce a new pattern, library, or convention.**

---

## Overview

InsightBase is a full-stack, self-hosted analytics and BI platform. Non-technical users build queries visually; power users write SQL. Results render as interactive charts and dashboards.

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌───────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ Query     │ │ Dashboard│ │ SQL Editor           │ │
│  │ Builder   │ │ Designer │ │ (Monaco)             │ │
│  └───────────┘ └──────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────┤
│              API Layer (Next.js API Routes)          │
├─────────────────────────────────────────────────────┤
│               Query Execution Engine                 │
│  ┌───────────────────────────────────────────────┐   │
│  │  AQR (JSON) → SQL Generator (pure function)   │   │
│  │  Connection Pool Manager                      │   │
│  │  Result Transformer & Cacher                  │   │
│  └───────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Internal DB (SQLite/PG)  │  Connected Databases     │
│  - Users, Permissions     │  - PostgreSQL             │
│  - Saved Questions (AQR)  │  - MySQL                  │
│  - Dashboards             │  - SQLite                 │
│  - Activity Logs          │  - MSSQL                  │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology              | Version  | Notes                                |
| -------------- | ----------------------- | -------- | ------------------------------------ |
| Framework      | Next.js (App Router)    | 14+      | Server Components by default         |
| Language       | TypeScript              | 5+       | Strict mode                          |
| Styling        | Tailwind CSS            | 3+       | shadcn/ui (New York, Zinc, CSS vars) |
| State          | Zustand                 | 4+       | Client components only               |
| Charts         | Recharts                | 2+       | SVG-based, component API             |
| Dashboard Grid | react-grid-layout       | 1.4+     | Drag, resize, responsive             |
| SQL Editor     | @monaco-editor/react    | 4+       | Custom SQL autocomplete              |
| Tables         | @tanstack/react-virtual | 3+       | Virtualized rendering                |
| Auth           | next-auth (Auth.js v5)  | beta     | JWT sessions, Credentials provider   |
| ORM            | Prisma                  | 5+       | SQLite (dev), PostgreSQL (prod)      |
| Encryption     | Node.js crypto          | built-in | AES-256-GCM                          |
| Font           | Inter                   | —        | Google Fonts                         |

---

## Golden Rules

1. **AQR is the contract.** The Abstract Query Representation (JSON) sits between the UI and the SQL Generator. UI state → AQR → SQL. Never bypass.
2. **SQL Generator is pure.** `(aqr: AQR, engine: DBEngine) => { sql: string, params: any[] }`. No side effects. Unit-testable.
3. **Feature flags gate everything.** See `src/lib/feature-flags.ts`. Advanced features stay behind flags until stable.
4. **Encrypt all secrets.** Database passwords use AES-256-GCM. Never store plaintext. Key from `ENCRYPTION_KEY` env var.
5. **Server does heavy lifting.** The database handles aggregation/filtering. Browser only renders the result (max 2000 rows).
6. **Stateless API.** Next.js API routes + JWT = horizontally scalable. No server-side session stores.
7. **Never commit to main.** Use `feature/<phase>-<name>` branches. Merge only via PR.

---

## Key Architecture Decisions

### ADR-001: Custom AQR over third-party query builder

**Decision:** Build a custom Abstract Query Representation (JSON) instead of using a library like Kysely or Knex directly.
**Rationale:**

- The AQR decouples the UI from SQL, making the query builder UI framework-agnostic.
- LLMs can target the AQR schema for natural-language-to-query (Phase 7).
- The SQL Generator can be unit-tested independently of the frontend.

### ADR-002: react-grid-layout over @dnd-kit alone for dashboards

**Decision:** Use `react-grid-layout` for the dashboard grid, supplemented by `@dnd-kit` for drag-from-sidebar interactions.
**Rationale:** RGL has built-in drag, resize, responsive breakpoints, and serializable layouts — all critical for dashboards.

### ADR-003: SQLite as default internal database

**Decision:** Ship with SQLite for zero-config setup. Support PostgreSQL via Prisma provider swap.
**Rationale:** Open-source users need `docker compose up` to work instantly. Enterprise users swap to PG for scale.

### ADR-004: Auth.js v5 (beta) over v4

**Decision:** Use `next-auth@beta` (Auth.js v5) for native App Router support.
**Rationale:** v4 has known edge cases with App Router. v5 is the recommended path forward.

### ADR-005: AI agents target AQR, not raw SQL

**Decision:** When AI features land (Phase 7), LLMs will generate AQR JSON, not raw SQL.
**Rationale:** Safety (no SQL injection), portability (AQR is dialect-agnostic), and validation (AQR has a strict TypeScript schema).

---

## Feature Flag Registry

```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  SQL_EDITOR: true,
  CHARTS: true,
  DASHBOARDS: false,
  PUBLIC_SHARING: false,
  SCHEDULED_REPORTS: false,
  DATA_MODELS: false,
  ROW_LEVEL_SECURITY: false,
  AI_INSIGHTS: false,
} as const;
```

Update this registry as phases ship.

---

## Scalability Notes

- **Horizontal scaling:** Stateless API + JWT = deploy N pods behind a load balancer
- **Connection pooling:** `connection-pool.ts` manages connections lazily, disposes after timeout
- **Query limits:** SQL Generator enforces `LIMIT 2000` for raw data. Aggregations are unbounded (DB handles it).
- **Caching (Phase 6):** Redis cache keyed by `hash(AQR)`. BullMQ workers warm cache on schedule.
- **Internal DB migration:** Prisma provider swap from SQLite → PostgreSQL for enterprise.

---

## Conventions

### File Structure

```
src/
├── app/               # Next.js App Router pages
│   ├── (auth)/        # Login, signup, setup (no sidebar)
│   ├── (main)/        # Authenticated pages (with sidebar)
│   └── api/           # API routes
├── components/
│   ├── ui/            # shadcn/ui primitives
│   ├── layout/        # Sidebar, Topbar, AppShell
│   ├── query-builder/ # Query builder step components
│   ├── sql-editor/    # Monaco wrapper
│   ├── visualization/ # Charts, DataTable, KPI
│   ├── dashboard/     # Grid, Card, FilterBar
│   └── shared/        # Modals, pickers, common UI
├── lib/
│   ├── auth.ts        # Auth.js config
│   ├── db.ts          # Prisma singleton
│   ├── encryption.ts  # AES-256-GCM
│   ├── feature-flags.ts
│   ├── query-engine/  # AQR types, SQL gen, pool, introspection
│   ├── ai/            # Reserved for Phase 7
│   └── utils/
├── stores/            # Zustand stores
└── types/             # Shared TypeScript types
```

### Naming

- **Components:** PascalCase (`QueryBuilderWizard.tsx`)
- **Utils/libs:** camelCase (`sqlGenerator.ts`)
- **API routes:** kebab-case folders (`/api/database/[id]/test/route.ts`)
- **CSS:** Tailwind utilities + CSS variables for theming
