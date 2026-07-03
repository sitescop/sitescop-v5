# SiteScop V5 — Inspection Platform

Production-grade building, pest, and combined inspection management platform.

## Run from GitHub (any PC)

```bash
git clone https://github.com/sitescop/sitescop-v5.git
cd sitescop-v5
npm install
npm approve-scripts @embedded-postgres/windows-x64 embedded-postgres
copy .env.example .env
npm run dev
```

On Mac/Linux, use `cp .env.example .env` instead of `copy`.

- **Web app:** http://localhost:5173  
- **Login:** http://localhost:5173/login  
- **API:** http://localhost:3001  

`npm run dev` starts embedded PostgreSQL (port 5433), runs migrations, seeds demo data, and launches the API + web app.

## Prerequisites

- Node.js 20+
- npm 10+
- Git

Optional: Docker (for Mailpit local email testing)

## Seeded Users

Password for all seeded accounts: `SiteScop2026!`

| Email | Role |
|-------|------|
| admin@sitescop-demo.com.au | Company Admin |
| manager@sitescop-demo.com.au | Office Manager |
| staff@sitescop-demo.com.au | Office Staff |
| inspector@sitescop-demo.com.au | Inspector |
| accountant@sitescop-demo.com.au | Accountant |
| client@sitescop-demo.com.au | Client Portal |

## Main workflow (agreement-first)

1. **Agreements → Send Agreement** — client name, email, mobile, price → send (copy signing link manually until SMTP is set)
2. Client signs online (property address on signing page if not entered upfront)
3. **Accounts** — invoice created after sign → **Mark as Paid** when payment received
4. **Job** auto-created → assign inspector → inspector accepts → start inspection
5. Admin reviews inspection → **Generate PDFs** → download and email client manually (auto-email coming later)

## Email (Zoho — optional)

Copy `.env.example` to `.env` and set Zoho SMTP for `info@sitescop.com.au`:

```env
SMTP_HOST=smtppro.zoho.com.au
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@sitescop.com.au
SMTP_PASS=your-zoho-app-password
```

Restart the API after changing `.env`.

## Project Structure

```
sitescop-v5/
├── apps/
│   ├── web/          React frontend
│   └── api/          Fastify API
├── packages/
│   ├── shared-types/
│   ├── room-engine-core/
│   └── report-pdf/
└── docker-compose.yml
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start DB + API + web (development) |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |

## Repository

https://github.com/sitescop/sitescop-v5
