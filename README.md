# SiteScop V5 — Inspection Platform

Production-grade building, pest, and combined inspection management platform.

## Phase 0 — Foundation (Complete)

- Turborepo monorepo
- React + TypeScript + Vite frontend
- Fastify + Prisma + PostgreSQL API
- Authentication (login, logout, forgot/reset password)
- Role-based access control (7 roles)
- Design system and AppShell
- Role-aware dashboards

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

```bash
npm install
npm approve-scripts @embedded-postgres/windows-x64 embedded-postgres
npm run dev
```

`npm run dev` starts embedded PostgreSQL (port 5433), runs migrations, seeds demo users, and launches the API + web app.

- **Web app:** http://localhost:5173
- **Login:** http://localhost:5173/login
- **API:** http://localhost:3001
- **Health check:** http://localhost:3001/api/v1/health

For Docker-based PostgreSQL/Redis instead, use `docker compose up -d` and set `DATABASE_URL` to port 5432 in `.env`.

## Seeded Users

Password for all seeded accounts: `SiteScop2026!`

| Email | Role |
|-------|------|
| superadmin@sitescop.com.au | Super Admin |
| admin@sitescop-demo.com.au | Company Admin |
| manager@sitescop-demo.com.au | Office Manager |
| staff@sitescop-demo.com.au | Office Staff |
| inspector@sitescop-demo.com.au | Inspector |
| accountant@sitescop-demo.com.au | Accountant |
| client@sitescop-demo.com.au | Client Portal |

## Project Structure

```
sitescop-v5/
├── apps/
│   ├── web/          React frontend
│   └── api/          Fastify API
├── packages/
│   ├── shared-types/ Shared TypeScript types & RBAC
│   ├── room-engine-core/ Room engines (Phase 3)
│   └── eslint-config/
└── docker-compose.yml
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development |
| `npm run build` | Production build |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |

## Next Phase

Phase 1 — Core Platform: Jobs module, CRM, Settings, Admin user management.
