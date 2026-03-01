# InsightBase — Roadmap & Task Tracker

> This is the **living task checklist** for InsightBase. Update this file as you work.
>
> - `[ ]` = Not started
> - `[/]` = In progress
> - `[x]` = Completed

---

## Phase 1: Foundation (Alpha) - COMPLETE

### 1.0 Project Setup

- [x] Initialize Next.js 16 with TypeScript, Tailwind CSS, shadcn/ui
- [x] Set up Prisma with SQLite + full schema (all models)
- [x] Configure Git repo + feature branches
- [x] Set up `.env.example` with all config variables
- [ ] Create Docker + docker-compose setup

### 1.1 Authentication

- [x] Auth.js v5 (next-auth@beta) with Credentials provider
- [x] Login & signup pages (shadcn Card + Form + zod validation)
- [x] First-user setup flow (auto-admin via ADMIN_EMAIL)
- [x] JWT session management + middleware route protection
- [ ] Rate limiting on login endpoint

### 1.2 App Shell Layout

- [x] Sidebar navigation (Home, Questions, Dashboards, New Question, SQL Editor, Admin)
- [x] Top bar (user avatar, theme toggle)
- [x] Responsive design (collapsible sidebar)
- [x] Dark/light theme with CSS variables
- [x] Loading skeletons and empty states

### 1.3 Database Connection Management

- [x] Admin Settings → Database Connections page
- [x] Connection form (name, type, host, port, db, user, password, SSL)
- [x] AES-256-GCM encryption for stored passwords
- [x] "Test Connection" button with success/error feedback
- [x] Schema introspection (tables, columns, PKs)
- [x] Store schema cache as JSON in internal DB
- [x] "Sync Schema" button to refresh

### 1.4 Schema Browser

- [x] Tree-view: Database → Tables → Columns
- [x] Click table/column to insert in SQL editor
- [ ] Click table → sample data (first 10 rows)
- [ ] Foreign key relationship indicators
- [x] Search/filter across tables

---

## Phase 2: Query Engine & Builder (Beta) - COMPLETE

### 2.1 Query Engine Core

- [x] Abstract Query Representation (AQR) TypeScript types
- [x] SQL Generator: pure function `(aqr, engine) => { sql, params }`
- [x] PostgreSQL, MySQL, and SQLite dialect support
- [x] Connection Pool Manager (lazy creation, timeout disposal)
- [x] Result Transformer (type-aware formatting)

### 2.2 Visual Query Builder UI

- [x] Step 1: Database picker (grid layout)
- [x] Step 2: Table picker (search, filter)
- [x] Step 3: Column selector (checkboxes, type icons)
- [x] Step 4: Filter builder (type-aware operators, AND/OR groups)
- [x] Step 5: Summarize (group by, aggregations: Count/Sum/Avg/Min/Max)
- [x] Step 6: Sort & Limit
- [x] "View SQL" toggle to see generated query

### 2.3 SQL Editor

- [x] Monaco Editor integration (`@monaco-editor/react`)
- [x] Syntax highlighting
- [x] Run query (Ctrl+Enter)
- [x] Schema explorer sidebar
- [x] Save as Native Question
- [ ] Query history (last 50 per user)
- [ ] Autocomplete from cached schema

### 2.4 Results Table

- [x] Virtualized data table (`@tanstack/react-virtual`)
- [x] Column sorting & resizing
- [x] Cell formatting by type (numbers, dates, booleans)
- [x] Export to CSV and JSON
- [x] Row count and execution time display
- [x] Truncation warning (2000 row limit)

---

## Phase 3: Visualization (RC1) - COMPLETE

### 3.1 Chart Types

- [x] Bar Chart (Recharts)
- [x] Line Chart
- [x] Area Chart
- [x] Pie / Donut Chart
- [x] Number / KPI Card
- [x] Scatter Plot
- [x] Auto-visualization detection (suggest best chart type)
- [x] Chart settings panel (axes selection)
- [ ] Chart settings (colors, legend, goal lines)

### 3.2 Saving Questions

- [x] Save modal (name, description)
- [x] Save from Query Builder
- [x] Save from SQL Editor
- [x] Questions listing page
- [x] Question viewer page with auto-execution
- [x] Delete questions
- [x] Archive questions
- [ ] Edit, duplicate, move questions
- [ ] Collection picker in save modal

---

## Phase 4: Dashboards (RC2) - COMPLETE

- [x] Dashboard builder with `react-grid-layout`
- [x] Create new dashboard modal
- [x] Add saved questions as cards
- [x] Drag-and-drop resize/rearrange
- [x] Remove cards
- [x] Dashboard listing page
- [x] Delete dashboards
- [x] Activity tracking (views, runs)
- [ ] Text / Markdown cards
- [ ] Link cards
- [ ] Dashboard filters (dropdowns, date pickers)
- [ ] Share via public link (slug-based)
- [ ] Full-screen presentation mode
- [ ] Auto-refresh toggle

---

## Phase 5: Organization & Polish (GA) - IN PROGRESS

- [x] Home page with recently viewed questions
- [x] Activity feed API
- [ ] Collections (hierarchical folders, breadcrumbs, permissions)
- [x] Global search (Ctrl+K) across questions, dashboards, tables
- [ ] User management (invite, roles: Admin/Editor/Viewer, groups)
- [ ] Permission model (database-level, collection-level)
- [ ] Keyboard shortcuts reference (`?` to show)
- [ ] Onboarding tour for first-time users
- [ ] Version history for questions/dashboards
- [ ] Error handling UX polish (human-readable DB errors)

---

## Phase 6: Advanced Features (Post-GA)

- [ ] Caching layer (Redis, TTL per question, "cached at" timestamp)
- [ ] Scheduled reports & alerts (BullMQ + email via SMTP/SendGrid)
- [ ] Data Model Layer (friendly names, hidden columns, custom expressions)
- [ ] REST API with API key auth (`/api/card/:id/query`, `/api/dataset`)
- [ ] Rate limiting on API endpoints
- [ ] Audit log UI (all CRUD, logins, query executions)
- [ ] PDF export for dashboards
- [ ] Row-Level Security (RLS)

---

## Phase 7: AI-Powered Insights (Future Vision)

- [ ] AI agent integration (LLM-powered graph explanations)
- [ ] Natural language → AQR → SQL ("Show me sales by region last quarter")
- [ ] Auto-generated insight summaries on dashboards
- [ ] Anomaly detection alerts ("Revenue dropped 15% vs last week")
- [ ] Smart suggestions ("Users who viewed X also looked at Y")
