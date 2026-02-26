---
description: Development workflow for building and iterating on InsightBase analytics platform
---

# InsightBase Development Workflow

// turbo-all

## 0. Branch Strategy

1. Never commit directly to `main`
2. Create feature branches: `feature/<phase>-<feature-name>` (e.g. `feature/p1-auth`, `feature/p2-query-engine`)
3. Raise PR after each phase milestone — merge only after user approval

## 1. Tech Stack Skills Reference

### Core Framework — Next.js 14+ (App Router)

- **Install**: `npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- Use **Server Components** by default; add `"use client"` only for interactive components
- Route groups: `(auth)` for login/signup, `(main)` for authenticated pages
- File conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- Use `next/image` for optimized images, dynamic imports for code splitting

### UI Components — shadcn/ui

- **Init**: `npx shadcn@latest init` (select New York style, Zinc color, CSS variables)
- **Add components**: `npx shadcn@latest add button card input form dialog dropdown-menu sheet table avatar badge separator skeleton toast tabs`
- Components are copied to `src/components/ui/` — fully customizable
- Built on Radix UI primitives — accessible by default

### State Management — Zustand

- **Install**: `npm install zustand`
- Create stores in `src/stores/` with `create()` function
- Use in Client Components only
- Supports persistence middleware: `persist(...)` for localStorage

### Authentication — Auth.js (NextAuth v5)

- **Install**: `npm install next-auth@beta @auth/prisma-adapter`
- Config file: `src/lib/auth.ts` using `NextAuth({ providers: [...] })`
- Credentials provider: implement `authorize()` with password verification
- JWT strategy for sessions; middleware for route protection
- API route: `src/app/api/auth/[...nextauth]/route.ts`

### Database ORM — Prisma

- **Install**: `npm install prisma @prisma/client` then `npx prisma init --datasource-provider sqlite`
- Schema: `prisma/schema.prisma`
- Migrations: `npx prisma migrate dev --name <name>`
- Client singleton: use global variable pattern to avoid hot-reload issues in dev
- Generate: `npx prisma generate`

### Database Drivers (for user-connected databases)

- **PostgreSQL**: `npm install pg @types/pg`
- **SQLite**: `npm install better-sqlite3 @types/better-sqlite3`
- **MySQL**: `npm install mysql2`
- **MSSQL**: `npm install tedious`

### Encryption — AES-256-GCM

- Use Node.js built-in `crypto` module (no external dep)
- Generate 32-byte key via `crypto.randomBytes(32)`, store in env as hex
- 12-byte IV per encryption, prepend IV + authTag to ciphertext for storage
- Never reuse IV with same key

### SQL Editor — Monaco Editor

- **Install**: `npm install @monaco-editor/react monaco-editor`
- Use `<Editor language="sql" />` from `@monaco-editor/react`
- Must be `"use client"` component (browser-only)
- Custom autocomplete via `monaco.languages.registerCompletionItemProvider('sql', ...)`
- Run with `Ctrl+Enter` keyboard shortcut

### Charts — Recharts

- **Install**: `npm install recharts`
- Component-based: `<BarChart>`, `<LineChart>`, `<PieChart>`, `<AreaChart>`
- Responsive via `<ResponsiveContainer width="100%" height={400}>`
- Pair with `<Tooltip>`, `<Legend>`, `<CartesianGrid>` for polish

### Dashboard Grid — react-grid-layout

- **Install**: `npm install react-grid-layout @types/react-grid-layout`
- Use `<ResponsiveGridLayout>` with `WidthProvider` for responsive breakpoints
- Import CSS: `react-grid-layout/css/styles.css` and `react-resizable/css/styles.css`
- Layout is serializable JSON — store in DB for persistence
- Supports drag, resize, and static/locked items

### Virtualized Tables — @tanstack/react-virtual

- **Install**: `npm install @tanstack/react-virtual`
- Use `useVirtualizer` hook with scroll container ref
- Configure `count`, `estimateSize`, `getScrollElement`
- Pair with `@tanstack/react-table` for full-featured data tables

### Job Queue — BullMQ (Phase 7)

- **Install**: `npm install bullmq ioredis`
- Requires Redis 6.2+
- Create Queue + Worker pattern
- Use `JobScheduler` API for repeatable/cron jobs
- Store job data in Redis, process in background workers

### Drag & Drop — @dnd-kit (supplementary)

- **Install**: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Use for sidebar reordering, card dragging into dashboard
- Pair with react-grid-layout (RGL handles grid, dnd-kit handles "add to grid" from sidebar)

## 2. Key Architecture Patterns

### Abstract Query Representation (AQR)

- JSON object describing query intent (table, columns, filters, aggregations, sorts, limit)
- SQL Generator is a **pure function**: `(aqr: AQR, engine: DBEngine) => { sql: string, params: any[] }`
- Support dialect differences (e.g. `LIMIT` vs `TOP`, quoting rules)
- Refer to Kysely's query builder pattern and ts-sql AST approach for inspiration

### Schema Introspection

- **PostgreSQL**: `SELECT * FROM information_schema.tables / columns / key_column_usage / table_constraints`
- **SQLite**: `SELECT * FROM sqlite_master WHERE type='table'`, `PRAGMA table_info(table_name)`, `PRAGMA foreign_key_list(table_name)`
- **MySQL**: Same as PG via `information_schema`
- Cache introspected schema as JSON in `DatabaseConnection.schemaCache`

### Connection Pool

- Create connection instances lazily, cache by `databaseConnectionId`
- Dispose inactive connections after timeout
- All queries execute in read-only mode where possible

## 3. Development Commands

```bash
# Start dev server
npm run dev

# Prisma commands
npx prisma migrate dev --name <migration_name>
npx prisma generate
npx prisma studio  # visual DB browser

# Add shadcn component
npx shadcn@latest add <component-name>

# Build & type check
npm run build

# Docker
docker compose up --build
```
