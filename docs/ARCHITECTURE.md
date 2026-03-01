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
│  /api/databases    /api/questions    /api/dashboards │
│  /api/activity     /api/auth                         │
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
│  - Dashboards, Cards      │  - SQLite                 │
│  - Activity Logs          │  - MSSQL (planned)        │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js (App Router) | 16.1.6 | Server Components by default |
| Language | TypeScript | 5+ | Strict mode |
| Styling | Tailwind CSS | 4.0 | shadcn/ui (New York preset) |
| Animations | Framer Motion | 12.34.3 | Smooth UI transitions |
| State | Zustand | 5.0.11 | Client components only |
| Forms | React Hook Form + Zod | 7.71+ / 4.3+ | Type-safe validation |
| Charts | Recharts | 3.7.0 | SVG-based, component API |
| Dashboard Grid | react-grid-layout | 2.2.2 | Drag, resize, responsive |
| SQL Editor | @monaco-editor/react | 4.7.0 | VS Code editor in browser |
| Tables | @tanstack/react-virtual | 3.13+ | Virtualized rendering |
| Auth | next-auth (Auth.js v5) | 5.0.0-beta | JWT sessions, Credentials provider |
| ORM | Prisma | 7.4.1 | SQLite (dev), PostgreSQL (prod) |
| Encryption | Node.js crypto | built-in | AES-256-GCM |
| Date Utils | date-fns | 4.1.0 | Lightweight date manipulation |
| Icons | Lucide React | 0.575.0 | Modern icon set |

---

## Golden Rules

1. **AQR is the contract.** The Abstract Query Representation (JSON) sits between the UI and the SQL Generator. UI state → AQR → SQL. Never bypass.
2. **SQL Generator is pure.** `(aqr: AQR, engine: DBEngine) => { sql: string, params: any[] }`. No side effects. Unit-testable.
3. **Feature flags gate everything.** See `src/lib/feature-flags.ts`. Advanced features stay behind flags until stable.
4. **Encrypt all secrets.** Database passwords use AES-256-GCM. Never store plaintext. Key from `ENCRYPTION_KEY` env var.
5. **Server does heavy lifting.** The database handles aggregation/filtering. Browser only renders the result (max 2000 rows).
6. **Stateless API.** Next.js API routes + JWT = horizontally scalable. No server-side session stores.
7. **Activity tracking.** Log all significant user actions for audit and recent activity features.

---

## Key Architecture Decisions

### ADR-001: Custom AQR over third-party query builder

**Decision:** Build a custom Abstract Query Representation (JSON) instead of using a library like Kysely or Knex directly.
**Rationale:**

- The AQR decouples the UI from SQL, making the query builder UI framework-agnostic.
- LLMs can target the AQR schema for natural-language-to-query (Phase 7).
- The SQL Generator can be unit-tested independently of the frontend.

### ADR-002: react-grid-layout for dashboards

**Decision:** Use `react-grid-layout` for the dashboard grid.
**Rationale:** RGL has built-in drag, resize, responsive breakpoints, and serializable layouts — all critical for dashboards.

### ADR-003: SQLite as default internal database

**Decision:** Ship with SQLite for zero-config setup. Support PostgreSQL via Prisma provider swap.
**Rationale:** Open-source users need instant setup. Enterprise users swap to PG for scale.

### ADR-004: Auth.js v5 (beta) over v4

**Decision:** Use `next-auth@beta` (Auth.js v5) for native App Router support.
**Rationale:** v4 has known edge cases with App Router. v5 is the recommended path forward.

### ADR-005: AI agents target AQR, not raw SQL

**Decision:** When AI features land (Phase 7), LLMs will generate AQR JSON, not raw SQL.
**Rationale:** Safety (no SQL injection), portability (AQR is dialect-agnostic), and validation (AQR has a strict TypeScript schema).

### ADR-006: Recharts for visualization

**Decision:** Use Recharts for all chart rendering.
**Rationale:** React-native components, good TypeScript support, active maintenance, and covers all required chart types.

---

## Feature Flag Registry

```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  SQL_EDITOR: true,       // Raw SQL editor
  CHARTS: true,           // Chart visualizations
  DASHBOARDS: true,       // Dashboard builder
  PUBLIC_SHARING: false,  // Public dashboard links
  SCHEDULED_REPORTS: false,
  DATA_MODELS: false,
  ROW_LEVEL_SECURITY: false,
  AI_INSIGHTS: false,
} as const;
```

Update this registry as phases ship.

---

## API Structure

```
/api
├── auth/
│   ├── [...nextauth]/route.ts    # Auth.js handler
│   └── signup/route.ts           # User registration
├── databases/
│   ├── route.ts                  # List/create connections
│   ├── test/route.ts             # Test connection
│   └── [id]/
│       ├── route.ts              # Get/update/delete connection
│       ├── sync/route.ts         # Schema introspection
│       └── query/route.ts        # Execute queries
├── questions/
│   ├── route.ts                  # List/create questions
│   ├── recent/route.ts           # Recently viewed
│   └── [id]/
│       ├── route.ts              # Get/update/delete question
│       └── run/route.ts          # Execute question
├── dashboards/
│   ├── route.ts                  # List/create dashboards
│   └── [id]/
│       ├── route.ts              # Get/update/delete dashboard
│       └── cards/route.ts        # Manage dashboard cards
└── activity/
    └── route.ts                  # User activity log
```

---

## Data Models

### Core Entities

| Model | Purpose |
|-------|---------|
| User | Authentication, roles (ADMIN/VIEWER) |
| DatabaseConnection | External data sources with encrypted credentials |
| Question | Saved queries (AQR or raw SQL) with viz settings |
| Dashboard | Grid-based collections of cards |
| DashboardCard | Links questions to dashboards with layout info |
| Collection | Hierarchical organization (future) |
| Activity | Audit log of user actions |
| Permission | Role-based access control (future) |

### Key Relationships

- User → Questions (creator)
- User → Dashboards (creator)
- Question → DashboardCards (many-to-many via cards)
- Dashboard → DashboardCards (one-to-many, cascade delete)
- Collection → Questions/Dashboards (optional organization)

---

## Scalability Notes

- **Horizontal scaling:** Stateless API + JWT = deploy N pods behind a load balancer
- **Connection pooling:** `connection-pool.ts` manages connections lazily, disposes after timeout
- **Query limits:** SQL Generator enforces `LIMIT 2000` for raw data. Aggregations are unbounded (DB handles it).
- **Caching (Phase 6):** Redis cache keyed by `hash(AQR)`. BullMQ workers warm cache on schedule.
- **Internal DB migration:** Prisma provider swap from SQLite → PostgreSQL for enterprise.

---

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, signup (no sidebar)
│   ├── (main)/             # Authenticated pages (with sidebar)
│   │   ├── page.tsx        # Home dashboard
│   │   ├── questions/      # Questions listing
│   │   ├── question/       # Question builder & viewer
│   │   ├── dashboards/     # Dashboards listing
│   │   ├── dashboard/      # Dashboard viewer
│   │   ├── sql/            # SQL editor
│   │   └── admin/          # Admin pages
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui primitives (37 components)
│   ├── layout/             # Sidebar, Topbar
│   ├── providers/          # Auth, Theme providers
│   ├── admin/              # Database form
│   ├── dashboard/          # Home dashboard components
│   └── query/              # Query builder, charts, results
│       ├── builder/        # Step components
│       ├── QueryChart.tsx  # Visualization component
│       ├── ResultsTable.tsx
│       ├── SaveQuestionDialog.tsx
│       ├── SchemaExplorer.tsx
│       └── SqlEditor.tsx
├── lib/
│   ├── auth.ts             # Auth.js config
│   ├── db.ts               # Prisma singleton
│   ├── encryption.ts       # AES-256-GCM
│   ├── feature-flags.ts
│   ├── utils.ts
│   └── query-engine/       # Core query execution
│       ├── types.ts        # AQR types
│       ├── sql-generator.ts
│       ├── query-executor.ts
│       ├── connection-pool.ts
│       └── schema-builder.ts
├── stores/
│   └── query-builder-store.ts  # Zustand state
├── hooks/
│   └── use-mobile.ts
└── types/                  # Shared TypeScript types
```

---

## Conventions

### Naming

- **Components:** PascalCase (`QueryBuilderWizard.tsx`)
- **Utils/libs:** camelCase (`sqlGenerator.ts`)
- **API routes:** kebab-case folders (`/api/databases/[id]/query/route.ts`)
- **CSS:** Tailwind utilities + CSS variables for theming

### Code Style

- ESLint + Prettier for consistency
- Strict TypeScript (no `any` without explicit comment)
- Zod for runtime validation on all API inputs
- Server components by default, `"use client"` only when needed
