# InsightBase — Roadmap & Task Tracker

> This is the **living task checklist** for InsightBase. Update this file as you work.
>
> - `[ ]` = Not started
> - `[/]` = In progress
> - `[x]` = Completed

---

## Phase 1: Foundation (Alpha)

### 1.0 Project Setup

- [ ] Initialize Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- [ ] Set up Prisma with SQLite + full schema (all models)
- [ ] Configure Git repo + `feature/insightbase-foundation` branch
- [ ] Create Docker + docker-compose setup
- [ ] Set up `.env.example` with all config variables

### 1.1 Authentication

- [ ] Auth.js v5 (next-auth@beta) with Credentials provider
- [ ] Login & signup pages (shadcn Card + Form + zod validation)
- [ ] First-user setup flow (auto-admin)
- [ ] JWT session management + middleware route protection
- [ ] Rate limiting on login endpoint

### 1.2 App Shell Layout

- [ ] Sidebar navigation (Home, Collections, New Question, SQL Editor, Settings)
- [ ] Top bar (user avatar, search trigger, notifications, theme toggle)
- [ ] Responsive design (collapsible sidebar on tablet, hamburger on mobile)
- [ ] Dark/light theme with CSS variables
- [ ] Loading skeletons and empty states baked in from the start

### 1.3 Database Connection Management

- [ ] Admin Settings → Database Connections page
- [ ] Connection form (name, type, host, port, db, user, password, SSL)
- [ ] AES-256-GCM encryption for stored passwords
- [ ] "Test Connection" button with success/error feedback
- [ ] Schema introspection (tables, columns, PKs, FKs)
- [ ] Store schema cache as JSON in internal DB
- [ ] "Sync Schema" button to refresh

### 1.4 Schema Browser

- [ ] Tree-view: Database → Tables → Columns
- [ ] Click table → column details + sample data (first 10 rows)
- [ ] Foreign key relationship indicators
- [ ] Search/filter across tables and columns

---

## Phase 2: Query Engine & Builder (Beta)

### 2.1 Query Engine Core

- [ ] Abstract Query Representation (AQR) TypeScript types
- [ ] SQL Generator: pure function `(aqr, engine) => { sql, params }`
- [ ] PostgreSQL and SQLite dialect support
- [ ] Connection Pool Manager (lazy creation, timeout disposal)
- [ ] Result Transformer (type-aware formatting)

### 2.2 Visual Query Builder UI

- [ ] Step 1: Table picker (search, filter)
- [ ] Step 2: Column selector (checkboxes, type icons, related tables)
- [ ] Step 3: Filter builder (type-aware operators, AND/OR groups)
- [ ] Step 4: Summarize (group by, aggregations: Count/Sum/Avg/Min/Max)
- [ ] Step 5: Sort & Limit
- [ ] "View SQL" toggle to see generated query

### 2.3 SQL Editor

- [ ] Monaco Editor integration (`@monaco-editor/react`)
- [ ] Syntax highlighting + autocomplete from cached schema
- [ ] Run query (Ctrl+Enter)
- [ ] Query history (last 50 per user)
- [ ] Save as Native Question
- [ ] Keyboard shortcuts (Ctrl+Enter run, Ctrl+S save)

### 2.4 Results Table

- [ ] Virtualized data table (`@tanstack/react-virtual`)
- [ ] Column sorting & resizing
- [ ] Cell formatting by type (numbers, dates, URLs)
- [ ] Export to CSV and JSON
- [ ] Pagination / infinite scroll

---

## Phase 3: Visualization (RC1)

### 3.1 Chart Types

- [ ] Bar Chart, Line Chart, Area Chart (Recharts)
- [ ] Pie / Donut Chart
- [ ] Number / KPI Card
- [ ] Scatter Plot
- [ ] Auto-visualization detection (suggest best chart type)
- [ ] Chart settings panel (axes, colors, legend, goal lines)

### 3.2 Saving Questions

- [ ] Save modal (name, description, collection picker)
- [ ] Edit, duplicate, move, archive questions

---

## Phase 4: Dashboards (RC2)

- [ ] Dashboard builder with `react-grid-layout`
- [ ] Add saved questions as cards
- [ ] Text / Markdown cards
- [ ] Link cards
- [ ] Dashboard filters (dropdowns, date pickers → linked to card params)
- [ ] Drag-and-drop resize/rearrange
- [ ] Share via public link (slug-based)
- [ ] Full-screen presentation mode
- [ ] Auto-refresh toggle

---

## Phase 5: Organization & Polish (GA)

- [ ] Collections (hierarchical folders, breadcrumbs, permissions)
- [ ] Home page (recently viewed, pinned, popular, activity feed)
- [ ] Global search (Ctrl+K) across questions, dashboards, tables
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
- [ ] Audit log (all CRUD, logins, query executions)
- [ ] PDF export for dashboards
- [ ] Row-Level Security (RLS)

---

## Phase 7: AI-Powered Insights (Future Vision)

- [ ] AI agent integration (LLM-powered graph explanations)
- [ ] Natural language → AQR → SQL ("Show me sales by region last quarter")
- [ ] Auto-generated insight summaries on dashboards
- [ ] Anomaly detection alerts ("Revenue dropped 15% vs last week")
- [ ] Smart suggestions ("Users who viewed X also looked at Y")
