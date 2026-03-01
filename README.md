# Datrics - InsightBase

InsightBase (internally codenamed Datrics) is a premium, enterprise-grade business intelligence and internal analytics platform built with modern web technologies. It allows users to connect databases, visually build SQL queries, create dynamic dashboards, and manage data securely.

![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)

## Features

### Core Analytics
- **Database Connections**: Connect and introspect database schemas securely (PostgreSQL, MySQL, SQLite supported)
- **Visual Query Builder**: Build complex analytics queries with an intuitive step-by-step UI
- **Raw SQL Editor**: Powerful Monaco-based SQL terminal for advanced queries with schema autocomplete
- **Save & Reuse Questions**: Save queries for later access, organize in collections, and share with your team

### Visualization
- **Interactive Charts**: Bar, Line, Area, Pie, Scatter charts powered by Recharts
- **Smart Detection**: Auto-suggests best chart type based on your data
- **Number Cards**: Display single metrics prominently
- **Data Tables**: Virtualized tables with sorting, export to CSV/JSON

### Dashboards
- **Drag-and-Drop Builder**: Create dashboards using react-grid-layout
- **Question Cards**: Add saved questions as dashboard cards
- **Real-time Execution**: Cards auto-execute queries on load
- **Flexible Layouts**: Resize and rearrange cards freely

### Productivity
- **Global Search**: Command palette (Ctrl+K / Cmd+K) to quickly find questions, dashboards, and tables
- **Keyboard Shortcuts**: Navigate and control the app without leaving your keyboard

### Enterprise Features
- **Role-Based Access Control**: Admin, Editor, and Viewer roles with granular permissions
- **User Management**: Admin portal to create, edit, deactivate, and delete users
- **Per-Database Permissions**: Grant users access to specific databases with VIEW, QUERY, or ADMIN levels
- **Activity Tracking**: Audit log of question views, executions, creations, and admin actions
- **Encrypted Credentials**: AES-256-GCM encryption for database passwords
- **Schema Caching**: Fast schema browsing with cached introspection

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | [Next.js (App Router)](https://nextjs.org/) | 16.1.6 |
| Language | TypeScript | 5+ |
| Styling | TailwindCSS + Framer Motion | 4.0 |
| Database/ORM | [Prisma](https://www.prisma.io/) | 7.4.1 |
| Authentication | NextAuth (Auth.js v5) | 5.0.0-beta |
| Charts | Recharts | 3.7.0 |
| Dashboard Grid | react-grid-layout | 2.2.2 |
| SQL Editor | Monaco Editor | 4.7.0 |
| Tables | TanStack React Table + Virtual | 8.21+ |
| UI Components | Radix UI, Shadcn UI | Latest |
| Icons | Lucide React | 0.575.0 |

---

## Prerequisites

Before getting started, you need the following installed:

- **Node.js** (v18.x or v20.x recommended)
- **npm** or **yarn** or **pnpm**
- **Git**

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/datrics.git
cd datrics
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the provided `.env.example` file to create your local `.env` configuration.

```bash
cp .env.example .env
```

Fill out the variables in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Internal database path (default: `"file:./dev.db"`) |
| `AUTH_SECRET` | A random 32-character base64 string for JWT signing |
| `NEXTAUTH_URL` | Your app URL (default: `http://localhost:3000`) |
| `ENCRYPTION_KEY` | 64-character hex key for encrypting database credentials |
| `ADMIN_EMAIL` | Email address to auto-assign ADMIN role |

### 4. Database Initialization

Push the Prisma schema to your local SQLite database:

```bash
npx prisma db push
```

_(Optional)_ Launch Prisma Studio to view the local data:

```bash
npx prisma studio
```

### 5. Start the Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the application!

---

## Application Structure

```
/                     - Home dashboard with recent questions
/questions            - List all saved questions
/question/new         - Visual query builder
/question/[id]        - View and run a saved question
/sql                  - SQL editor with schema browser
/dashboards           - List all dashboards
/dashboard/[id]       - View and edit a dashboard
/admin/databases      - Manage database connections (Admin only)
/admin/users          - Manage users and permissions (Admin only)
/admin/users/[id]     - User detail with permissions editor (Admin only)
```

---

## API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/databases` | GET, POST | List/create database connections |
| `/api/databases/[id]` | GET, PUT, DELETE | Manage single connection |
| `/api/databases/[id]/sync` | POST | Introspect database schema |
| `/api/databases/[id]/query` | POST | Execute AQR or raw SQL |
| `/api/questions` | GET, POST | List/create questions |
| `/api/questions/[id]` | GET, PUT, DELETE | Manage single question |
| `/api/questions/[id]/run` | POST | Execute a saved question |
| `/api/questions/recent` | GET | Get recently viewed questions |
| `/api/dashboards` | GET, POST | List/create dashboards |
| `/api/dashboards/[id]` | GET, PUT, DELETE | Manage single dashboard |
| `/api/dashboards/[id]/cards` | POST, PUT, DELETE | Manage dashboard cards |
| `/api/activity` | GET | Get user activity log |
| `/api/search` | GET | Search questions, dashboards, tables |
| `/api/admin/users` | GET, POST | List/create users (Admin) |
| `/api/admin/users/[id]` | GET, PUT, DELETE | Manage single user (Admin) |
| `/api/admin/users/[id]/activity` | GET | Get user's activity history (Admin) |
| `/api/admin/users/[id]/permissions` | GET, PUT | Manage user's database permissions (Admin) |

---

## Admin & Role Management

### User Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full access to all features, databases, and user management |
| `EDITOR` | Can create and edit questions/dashboards on permitted databases |
| `VIEWER` | Read-only access to questions/dashboards on permitted databases |

By default, users that sign up are granted the `VIEWER` role.

### Database Permissions

Non-admin users require explicit database permissions to access data:

| Level | Description |
|-------|-------------|
| `VIEW` | Can view schema and saved questions |
| `QUERY` | Can run queries and create questions |
| `ADMIN` | Full database administration |

Admin users automatically have full access to all databases.

### Granting Admin Privileges

#### Method 1: Environment Variable (Recommended)

Configure the `ADMIN_EMAIL` in your `.env` file. During your next login or signup with this exact email address, the system will automatically upgrade your role to `ADMIN`.

```env
ADMIN_EMAIL="your-email@example.com"
```

#### Method 2: Command Line Script

```bash
# Upgrade a specific user to ADMIN
npm run make-admin your-email@example.com

# Upgrade ALL existing users in the system to ADMIN
npm run make-admin
```

### Admin Portal

Once you have `ADMIN` privileges, the sidebar will show:

- **Admin -> Databases**: Manage database connections
- **Admin -> Users**: Manage users, roles, and permissions

From the Users admin page, you can:
- Create new users with specific roles
- Change user roles (Admin/Editor/Viewer)
- Activate or deactivate user accounts
- Grant per-database access permissions
- View user activity history
- Delete users

---

## Feature Flags

Feature availability is controlled via `src/lib/feature-flags.ts`:

| Feature | Status | Description |
|---------|--------|-------------|
| `SQL_EDITOR` | Enabled | Raw SQL query editor |
| `CHARTS` | Enabled | Chart visualizations |
| `DASHBOARDS` | Enabled | Dashboard builder |
| `PUBLIC_SHARING` | Disabled | Public dashboard links |
| `SCHEDULED_REPORTS` | Disabled | Automated report delivery |
| `DATA_MODELS` | Disabled | Semantic layer |
| `ROW_LEVEL_SECURITY` | Disabled | Per-user data filtering |
| `AI_INSIGHTS` | Disabled | AI-powered analytics |

---

## License

This software and the associated documentation are proprietary to and comprise valuable trade secrets of Anchit Gupta. Unauthorized copying, modification, or distribution is strictly prohibited. See the `LICENSE` file for more details.
