# SiteScop V5 — Production Deployment

**Quick start:** follow **[GO-LIVE.md](./GO-LIVE.md)** for the full Docker + HTTPS walkthrough.

## One-command deploy (Docker)

On a server with Docker installed:

```bash
cp .env.production.example .env.production
# Edit .env.production — domain, secrets, SMTP, admin user
npm run go-live
npm run db:seed:prod
```

Open `https://YOUR_APP_DOMAIN/login`.

## Stack

| Service | Role |
|---------|------|
| **Caddy** | HTTPS (Let's Encrypt), `/api` → API, `/` → web |
| **API** | Fastify on port 3001 (internal) |
| **Web** | Nginx serving `apps/web/dist` |
| **PostgreSQL** | Database (port 5432 on localhost for backups) |

## Environment variables

See [`.env.production.example`](../.env.production.example) for the full list.

Critical:

- `APP_DOMAIN` / `WEB_APP_URL` — must match your public HTTPS URL
- `SESSION_SECRET` — long random string
- `POSTGRES_PASSWORD` — strong DB password
- `SMTP_*` — Zoho (or other SMTP) for transactional email

## Manual deploy (without Docker)

```bash
npm install
npm run build
cd apps/api && npx prisma migrate deploy
NODE_ENV=production node dist/index.js
```

Serve `apps/web/dist` with nginx/Caddy; proxy `/api` to the API process.

## Post-deploy

- [ ] Login over HTTPS
- [ ] Agreement signing link uses public `WEB_APP_URL`
- [ ] Test email from Settings
- [ ] Inspector workflow end-to-end
- [ ] Database backups scheduled

See **GO-LIVE.md** for the complete checklist.
