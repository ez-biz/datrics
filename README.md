# Datrics - InsightBase 🚀

InsightBase (internally codenamed Datrics) is a premium, enterprise-grade business intelligence and internal analytics platform built with modern web technologies. It allows users to connect databases, visually build SQL queries, create dynamic dashboards, and manage data securely.

![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)

## ✨ Features

- **Database Architecture**: Connect and introspect database schemas securely (PostgreSQL, MySQL, SQLite supported).
- **Visual Query Builder**: Build complex analytics queries with an intuitive drag-and-drop UI.
- **Raw SQL Editor**: Powerful Monaco-based SQL terminal for advanced queries.
- **Dynamic Dashboards**: Create animated, customizable grid dashboards.
- **Enterprise UI/UX**: Built with Framer Motion, TailwindCSS, and custom SVG animations for a fluid, highly-polished experience.
- **Role-Based Access Control**: Secure Admin vs. Viewer segregation using NextAuth credentials.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.1.6 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: TailwindCSS & `framer-motion`
- **Database/ORM**: [Prisma](https://www.prisma.io/) (with `better-sqlite3` adapter)
- **Authentication**: NextAuth (Credentials Provider)
- **UI Components**: Radix UI, Shadcn UI
- **Icons**: Lucide React

---

## ⚙️ Prerequisites

Before getting started, you need the following installed:

- **Node.js** (v18.x or v20.x recommended)
- **npm** or **yarn** or **pnpm**
- **Git**

---

## 🚀 Setup & Installation

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

- `DATABASE_URL`: Typically `"file:./dev.db"` for local development.
- `AUTH_SECRET`: A random 32-character base64 string.
- `NEXTAUTH_URL`: Your development URL (usually `http://localhost:3000`).
- `ENCRYPTION_KEY`: A 64-character hex key to encrypt third-party database credentials.
- `ADMIN_EMAIL`: The email of the default Admin user (e.g., `admin@example.com`).

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

## 🛡️ Admin & Role Management

By default, users that sign up are granted the `VIEWER` role, which strictly limits their access to creating and connecting external database schemas. To grant yourself `ADMIN` privileges:

### Method 1: Environment Variable (Recommended)

Configure the `ADMIN_EMAIL` in your `.env` file. During your next login or signup with this exact email address, the system will automatically upgrade your role to `ADMIN`.

```env
ADMIN_EMAIL="your-email@example.com"
```

### Method 2: Command Line Script

If you need to manually upgrade a specific user, you can run the built-in npm automation script:

```bash
# Upgrade a specific user to ADMIN
npm run make-admin your-email@example.com

# Upgrade ALL existing users in the system to ADMIN
npm run make-admin
```

Once you have `ADMIN` privileges, a new **Admin -> Databases** section will appear in the application sidebar, allowing you to onboard and sync new external PostgreSQL, MySQL, and SQLite sources.

---

## 📜 License

This software and the associated documentation are proprietary to and comprise valuable trade secrets of Anchit Gupta. Unauthorized copying, modification, or distribution is strictly prohibited. See the `LICENSE` file for more details.
