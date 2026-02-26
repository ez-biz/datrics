---
name: InsightBase Project Knowledge
description: Living project knowledge base for the InsightBase analytics platform. Read this FIRST before any work on the project.
---

# InsightBase — Project Knowledge Skill

## Purpose

This skill serves as the **single source of truth** for the InsightBase project. It contains architecture decisions, the current roadmap, and conventions that ALL contributors (human or AI agent) MUST follow.

> **Rule:** Before making ANY change to InsightBase, read this file AND the referenced documents below. After completing work, update the relevant sections.

---

## Quick Links (Always Read First)

| Document                     | Path                                                                                            | Purpose                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Project Roadmap & Tasks**  | [ROADMAP.md](file:///Users/anchitgupta/alpha-game/docs/ROADMAP.md)                              | Living task checklist — mark items `[/]` when in-progress, `[x]` when done |
| **Architecture & Decisions** | [ARCHITECTURE.md](file:///Users/anchitgupta/alpha-game/docs/ARCHITECTURE.md)                    | Tech stack, architecture patterns, AI vision, scalability notes            |
| **Dev Workflow**             | [insightbase_dev.md](file:///Users/anchitgupta/alpha-game/.agents/workflows/insightbase_dev.md) | Install commands, setup steps, dev commands                                |
| **Changelog**                | [CHANGELOG.md](file:///Users/anchitgupta/alpha-game/docs/CHANGELOG.md)                          | What was built, when, and by whom                                          |

---

## Instructions for Agents and Collaborators

### Before Starting Any Work

1. **Read `ROADMAP.md`** — find the next unchecked `[ ]` task in the current phase
2. **Read `ARCHITECTURE.md`** — understand the tech stack, the AQR pipeline, and feature flags
3. **Read `insightbase_dev.md`** — get the exact install/setup commands
4. **Check the Changelog** — understand what was recently built to avoid conflicts

### While Working

1. **Branch naming:** `feature/<phase>-<feature>` (e.g., `feature/p1-auth`, `feature/p2-query-builder`)
2. **Never commit to `main`** — always use feature branches
3. **Update `ROADMAP.md`** — mark your current task as `[/]` (in-progress)
4. **Follow the feature flag pattern** — if the feature is gated, respect the flag

### After Completing Work

1. **Update `ROADMAP.md`** — mark completed tasks as `[x]`
2. **Update `CHANGELOG.md`** — add an entry with date, what was built, and key files changed
3. **Update `ARCHITECTURE.md`** — if you made any architecture decisions (new patterns, new libraries, schema changes), document them
4. **Raise a PR** — do not merge until reviewed

---

## Project Identity

- **Name:** InsightBase
- **Type:** Full-stack, open-source, self-hosted analytics & BI platform
- **Inspired By:** Metabase
- **Core Value Prop:** Non-technical users can explore data and build dashboards without writing SQL. Power users get a full SQL editor.

## Tech Stack Summary

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Frontend       | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| State          | Zustand                                                      |
| Charts         | Recharts                                                     |
| Dashboard Grid | react-grid-layout + @dnd-kit                                 |
| SQL Editor     | Monaco Editor (@monaco-editor/react)                         |
| Tables         | @tanstack/react-virtual + @tanstack/react-table              |
| Auth           | Auth.js v5 (next-auth@beta), JWT, bcryptjs                   |
| ORM (internal) | Prisma (SQLite default, PostgreSQL for production)           |
| DB Drivers     | pg, better-sqlite3, mysql2, tedious                          |
| Encryption     | Node.js crypto (AES-256-GCM)                                 |
| Job Queue      | BullMQ + ioredis (Phase 6+)                                  |
| AI (Future)    | LLM API (Phase 7 — graph explanations, NL-to-query)          |

## Current Phase

**Phase 1: Foundation** — Project setup, authentication, app shell, database connections, schema browser.

## Architecture Golden Rules

1. **AQR is king.** The Abstract Query Representation (JSON) is the contract between the UI and the SQL Generator. Never bypass it.
2. **SQL Generator is a pure function.** `(aqr, engine) => { sql, params }`. No side effects. Unit-testable.
3. **Feature flags gate everything.** Advanced features stay behind `FEATURES.XYZ` until ready.
4. **Encryption for all secrets.** DB passwords use AES-256-GCM. Never plaintext.
5. **Server does the heavy lifting.** The DB engine handles aggregation/filtering. The browser only renders results.
6. **Stateless API.** Next.js API routes + JWT = horizontally scalable.
