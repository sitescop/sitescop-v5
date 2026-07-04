# SiteScop V5 — Go Live Guide

Deploy the full app (PostgreSQL + API + web + HTTPS) with Docker on a VPS or dedicated server.

## What you need

| Item | Example |
|------|---------|
| **Server** | DigitalOcean, Vultr, AWS Lightsail, Hetzner (2 GB+ RAM) |
| **Domain** | `app.sitescop.com.au` → server public IP |
| **DNS** | A record: `app` → your server IP |
| **Ports open** | 80, 443 (firewall) |
| **Docker** | Docker Engine + Docker Compose v2 on the server |
| **Zoho SMTP** | `info@sitescop.com.au` with app password |

---

## Step 1 — Point DNS

In your domain registrar (e.g. where `sitescop.com.au` is managed):

| Type | Name | Value |
|------|------|-------|
| A | `app` | Your server public IP |

Wait 5–30 minutes for DNS to propagate.

---

## Step 2 — Server setup

SSH into the server and install Docker (Ubuntu example):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in
```

Clone the repo:

```bash
git clone https://github.com/sitescop/sitescop-v5.git
cd sitescop-v5
```

---

## Step 3 — Configure production env

```bash
cp .env.production.example .env.production
nano .env.production   # or use your editor
```

**Must change:**

| Variable | What to set |
|----------|-------------|
| `APP_DOMAIN` | `app.sitescop.com.au` |
| `WEB_APP_URL` | `https://app.sitescop.com.au` |
| `POSTGRES_PASSWORD` | Strong random password |
| `SESSION_SECRET` | 48+ random characters |
| `SMTP_*` | Zoho credentials |
| `PROD_ADMIN_EMAIL` | Your real admin email |
| `PROD_ADMIN_PASSWORD` | Strong password (12+ chars) |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Step 4 — Deploy

```bash
npm run go-live
```

This builds Docker images and starts:

- **postgres** — database (localhost:5432 for admin/backup)
- **api** — SiteScop API (internal)
- **web** — React static files (internal)
- **caddy** — HTTPS + routes `/api` → API, everything else → web

Caddy obtains a **Let's Encrypt** certificate automatically when DNS is correct.

---

## Step 5 — Create admin user

After containers are healthy (~30 seconds):

```bash
npm run db:seed:prod
```

Log in at `https://app.sitescop.com.au/login` with `PROD_ADMIN_EMAIL` / `PROD_ADMIN_PASSWORD`.

**Do not run** `npm run db:seed` in production (that loads demo data).

---

## Step 6 — Post-deploy checklist

- [ ] Login works over HTTPS
- [ ] **Settings → Company** — name, logo, contact details
- [ ] **Settings → Email** — send test email
- [ ] **Settings → SMS** — enable + test (if using Twilio)
- [ ] Send a test agreement → signing link uses `https://app…`
- [ ] Full flow: agreement → sign → invoice → job → inspect → PDF
- [ ] Client portal at `/portal`
- [ ] Schedule database backups (see below)

Health check: `https://app.sitescop.com.au/api/v1/health`

---

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run go-live:logs` | Follow container logs |
| `npm run go-live:down` | Stop production stack |
| `docker compose --env-file .env.production -f docker-compose.prod.yml ps` | Container status |
| `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` | Redeploy after code update |

---

## Updates (new version)

```bash
git pull
npm run go-live
```

Migrations run automatically when the API container starts.

---

## Database backup (recommended)

Daily cron example:

```bash
docker exec sitescop-prod-postgres pg_dump -U sitescop sitescop_v5 | gzip > /backups/sitescop-$(date +%F).sql.gz
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| HTTPS certificate fails | DNS not pointing to server yet; wait and restart caddy |
| Login works on HTTP not HTTPS | Set `WEB_APP_URL` to `https://…` and rebuild |
| Agreement links go to localhost | `WEB_APP_URL` wrong — fix `.env.production`, redeploy api |
| Email not sending | Check Zoho app password, `SMTP_HOST=smtppro.zoho.com.au` |
| 502 on /api | API still starting or crashed — check `npm run go-live:logs` |

---

## Optional services

| Service | Env vars |
|---------|----------|
| Stripe live payments | `STRIPE_SECRET_KEY=sk_live_…` |
| Twilio SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |

Rebuild after changing env: `npm run go-live`
