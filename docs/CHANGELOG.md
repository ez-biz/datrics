# InsightBase — Changelog

> All notable changes to InsightBase are documented here.
> Format: `[Date] — [Phase] — [What Changed]`

---

## [0.2.0] - 2026-03-01

### Phase 3-4: Visualization & Dashboards

#### Added
- **Chart Visualization Component** (`QueryChart.tsx`)
  - Bar, Line, Area, Pie, Scatter chart types
  - Number/KPI display for single metrics
  - Auto-detection of best chart type based on data
  - Interactive axis selection controls

- **Save Questions Feature**
  - `SaveQuestionDialog` component for saving queries
  - Questions API (`/api/questions`) with full CRUD
  - Question execution API (`/api/questions/[id]/run`)
  - Recently viewed questions API (`/api/questions/recent`)

- **Questions Management**
  - Questions listing page (`/questions`)
  - Question viewer page (`/question/[id]`)
  - Search, archive, and delete functionality
  - Auto-execution on question view

- **Dashboards Feature**
  - Enabled `DASHBOARDS` feature flag
  - Dashboards API (`/api/dashboards`) with full CRUD
  - Dashboard cards API (`/api/dashboards/[id]/cards`)
  - Dashboard listing page (`/dashboards`)
  - Dashboard builder page (`/dashboard/[id]`)
  - Drag-and-drop card layout with react-grid-layout
  - Add questions as cards
  - Real-time query execution for cards

- **Activity Tracking**
  - Activity API (`/api/activity`)
  - Logs: created_question, viewed_question, ran_question, created_dashboard, viewed_dashboard

- **Enhanced Home Dashboard**
  - Recent questions grid on home page
  - Dynamic loading of saved content
  - Quick action cards

- **SQL Editor Improvements**
  - Chart visualization tab (Table/Chart toggle)
  - Save question functionality
  - Visualization settings preserved with saves

- **Navigation Updates**
  - Added "Questions" link in sidebar
  - Added "Dashboards" link in sidebar

#### Changed
- Updated `db.ts` to export both `prisma` and `db` aliases
- Updated sidebar navigation structure
- Enabled dashboards feature flag

#### Technical
- 11 new API route files
- 5 new page components
- 3 new UI components
- Updated TypeScript types for Zod v4 compatibility
- Fixed react-grid-layout v2 API compatibility

---

## [0.1.0] - 2026-02-28

### Phase 1-2: Foundation & Query Engine

#### Added
- Next.js 16.1.6 project setup with App Router
- TypeScript strict mode configuration
- TailwindCSS 4 with shadcn/ui components (37 primitives)
- Framer Motion animations
- Prisma ORM with SQLite adapter

- **Authentication System**
  - NextAuth v5 (beta) with Credentials provider
  - JWT session strategy
  - Login and signup pages
  - Auto-admin assignment via `ADMIN_EMAIL`

- **Database Connection Management**
  - Admin database management page
  - PostgreSQL, MySQL, SQLite support
  - AES-256-GCM password encryption
  - Test connection functionality
  - Schema introspection and caching

- **Query Engine**
  - Abstract Query Representation (AQR) types
  - SQL Generator (PostgreSQL, MySQL, SQLite dialects)
  - Connection pool manager
  - Query executor for AQR and raw SQL

- **Visual Query Builder**
  - 6-step wizard UI
  - Database selector
  - Table selector
  - Column selector with type icons
  - Filter builder (AND/OR logic)
  - Summarize (aggregations + group by)
  - Sort & Limit

- **SQL Editor**
  - Monaco Editor integration
  - Schema explorer sidebar
  - Ctrl+Enter execution
  - Syntax highlighting

- **Results Table**
  - TanStack Table with virtualization
  - Column sorting
  - Export to CSV/JSON
  - Type-aware formatting

- **UI/UX**
  - Custom animated logo
  - Responsive sidebar
  - Dark/light theme toggle
  - Toast notifications (Sonner)
  - Loading skeletons

---

## [Unreleased]

### Planning Phase — 2026-02-26

- Created project roadmap and task tracker (`docs/ROADMAP.md`)
- Created architecture decisions document (`docs/ARCHITECTURE.md`)
- Completed feasibility analysis: tech stack confirmed
- Designed Phase 7 AI vision: LLM → AQR → SQL pipeline

---

_Add entries above as work progresses._
