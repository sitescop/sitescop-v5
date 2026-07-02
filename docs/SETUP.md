# SiteScop V5 Setup (Windows)

## Prerequisites

1. **Node.js 20+** (installed)
2. **Docker Desktop** OR **PostgreSQL 17** for the database

## Setup Steps

```powershell
cd "c:\Users\USER\Desktop\app to develop\sitescop-v5"

# Copy environment (already created as .env)
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# Start PostgreSQL + Redis (requires Docker Desktop)
docker compose up -d

# Install dependencies
npm install
npm approve-scripts @prisma/client prisma @prisma/engines esbuild

# Build shared packages
npm run build

# Run migrations and seed demo users
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev
```

## Without Docker

If using a local PostgreSQL installation, update `DATABASE_URL` in `.env` to match your credentials, then run:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

## Verify

- Web: http://localhost:5173
- API health: http://localhost:3001/api/v1/health
- Login: `admin@sitescop-demo.com.au` / `SiteScop2026!`

## Build Verification

```powershell
npm run build
```

All packages should build without errors.
