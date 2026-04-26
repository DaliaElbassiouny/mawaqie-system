# CDC System — نظام التحكم بالتكاليف
## Cost & Document Control System

A professional monorepo system for managing clients, tenders, projects, cost control, and procurement workflows — built with Arabic-first UI and corporate dark navy styling.

---

## What You Get in Phase 1

| Area | What is ready |
|---|---|
| Project foundation | Monorepo, TypeScript, ESLint, Prettier |
| Database | PostgreSQL + Prisma schema (all base tables) |
| Authentication | Login, logout, JWT + refresh token |
| RBAC | Roles, permissions, project-scoped role assignments |
| i18n | Arabic (default, RTL) + English (LTR) fully wired |
| UI Shell | Login page, sidebar, topbar, language switcher |
| Module pages | Dashboard + placeholder pages for all modules |
| API Docs | Swagger at `/api/docs` |
| DevOps | Docker Compose, Dockerfiles, CI pipeline |
| Seed data | Admin user, demo client, tender, project |

---

## Prerequisites — Install These First

You need the following installed on your computer:

1. **Node.js 20+** → https://nodejs.org (choose LTS version)
2. **pnpm 9+** → After installing Node, run: `npm install -g pnpm`
3. **Docker Desktop** → https://www.docker.com/products/docker-desktop (for the database)
4. **Git** → https://git-scm.com

---

## Local Setup — Step by Step

### Step 1 — Start the database

Open a terminal in this folder and run:

```bash
docker compose up postgres -d
```

This starts PostgreSQL in the background. Wait about 10 seconds for it to be ready.

### Step 2 — Copy environment files

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

> **Note:** The default values work for local development. Do not change them unless you know what you are doing.

### Step 3 — Install all dependencies

```bash
pnpm install
```

This installs packages for the backend, frontend, and shared library at once.

### Step 4 — Build the shared library

```bash
pnpm --filter @cdc/shared build
```

### Step 5 — Run database migrations

```bash
cd apps/api
pnpm prisma:migrate
```

When it asks for a migration name, type: `initial`

### Step 6 — Seed the database with demo data

```bash
pnpm db:seed
```

This creates:
- **Admin user:** `admin@cdc-system.local` / password: `Admin@123456`
- Demo client, tender, and project
- All system roles and permissions

### Step 7 — Start the applications

Open **two** terminal windows:

**Terminal 1 — Backend:**
```bash
cd apps/api
pnpm dev
```
API will run at: http://localhost:3001
Swagger docs at: http://localhost:3001/api/docs

**Terminal 2 — Frontend:**
```bash
cd apps/web
pnpm dev
```
App will run at: http://localhost:3000

### Step 8 — Open the app

Go to: **http://localhost:3000**

You will be automatically redirected to the Arabic login page.

Login with:
- Email: `admin@cdc-system.local`
- Password: `Admin@123456`

---

## Alternative: Run Everything with Docker

If you prefer to run everything with one command:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the API, and the web app together.

> **Note:** First build takes 5–10 minutes. Subsequent starts are fast.

---

## Project Structure

```
cdc-system/
├── apps/
│   ├── api/           ← NestJS backend (port 3001)
│   │   ├── prisma/    ← Database schema and seed
│   │   └── src/       ← All backend source code
│   └── web/           ← Next.js frontend (port 3000)
│       └── src/       ← All frontend source code
├── packages/
│   └── shared/        ← Shared TypeScript types used by both apps
├── docker-compose.yml ← Local development environment
└── README.md
```

---

## Default Login Credentials

| Field | Value |
|---|---|
| Email | `admin@cdc-system.local` |
| Password | `Admin@123456` |
| Role | Super Admin (full access) |

> **Important:** Change these credentials before going live.

---

## Available System Roles

| Role | Arabic | Access Level |
|---|---|---|
| SUPER_ADMIN | مدير النظام | Everything |
| ADMIN | مشرف | All except system-level settings |
| PROJECT_MANAGER | مدير مشروع | Projects, cost, procurement |
| COST_CONTROLLER | مراقب تكاليف | Cost control only |
| PROCUREMENT_OFFICER | مسؤول مشتريات | Procurement only |
| VIEWER | مشاهد | Read-only access |

---

## Useful Commands

```bash
# Run database migrations after schema changes
pnpm --filter @cdc/api prisma:migrate

# Open the database visual editor
pnpm db:studio

# Re-seed the database
pnpm db:seed

# Format all code
pnpm format

# Run linter
pnpm lint

# Build everything
pnpm build
```

---

## Switching Language

Click the language button (ع / EN) in the top-right corner of any page to switch between Arabic and English. The layout direction automatically switches between RTL (Arabic) and LTR (English).

---

## API Documentation

When the backend is running, open:  
**http://localhost:3001/api/docs**

This shows all available API endpoints. You can test them directly in the browser.

---

## What Comes Next (Phase 2+)

- Full Clients module with CRUD tables
- Full Tenders module
- Full Projects module
- Cost Control module with budget tracking
- Procurement module with purchase request workflows
- Approval workflow engine
- Excel workbook import system
- Reports and export

---

## Getting Help

If something does not work:
1. Make sure Docker Desktop is running
2. Make sure all `.env` files exist (Step 2 above)
3. Try deleting `node_modules` and running `pnpm install` again
4. Check the terminal for error messages — they usually say exactly what went wrong
