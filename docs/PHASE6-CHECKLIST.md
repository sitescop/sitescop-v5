# Phase 6 — Security pass & end-to-end test checklist

Use this on **localhost** before go-live. Password for all demo users: `SiteScop2026!`

---

## Security pass (code — done)

| Item | Status |
|------|--------|
| Block company admin from creating `SUPER_ADMIN` users | Fixed |
| Require strong `SESSION_SECRET` in production | Fixed |
| Stricter rate limits on login / forgot-password / reset-password | Fixed |
| Logout clears session cookie with matching flags | Fixed |
| Inspectors only see/download their own reports | Fixed |
| Inspectors only mark paid on their jobs/agreements | Fixed |
| Inspectors only send agreements for assigned jobs | Fixed |
| Health endpoint hides SMTP details in production | Fixed |

---

## 1. Authentication

- [ ] Login as `admin@sitescop-demo.com.au` — succeeds
- [ ] Login with wrong password — shows error, no crash
- [ ] Logout — returns to login; protected routes redirect
- [ ] Session persists after browser refresh
- [ ] Forgot password flow returns success message (dev reset URL in console/API if SMTP off)

---

## 2. Office workflow (admin / manager)

- [ ] **CRM** — create client with name, email, phone
- [ ] **Jobs → New job** — client, property, price, schedule date
- [ ] **Agreements → Send** — agreement email or signing link
- [ ] **Calendar** — drag unscheduled job onto a day (manager only)
- [ ] **Calendar** — drag job between days to reschedule
- [ ] **Jobs → Assign inspector** — inspector receives notification
- [ ] **Global search** (`Ctrl+K`) — find job by number, client name, suburb

---

## 3. Client signing (tablet or browser)

- [ ] Open signing link (from agreement detail or dev URL)
- [ ] Client enters property address if missing
- [ ] Client signs — status becomes Signed
- [ ] Invoice created in **Accounts**
- [ ] Job created or linked after payment step

---

## 4. Inspector field workflow

Login: `inspector@sitescop-demo.com.au`

- [ ] **Dashboard → Today's Jobs** — shows only today’s scheduled work
- [ ] **Calendar** — view only (no drag-and-drop); message to contact office
- [ ] **Manual job (tablet)** — client signs on tablet → job assigned to inspector
- [ ] **Mark invoice paid** on own job/agreement — succeeds
- [ ] Accept assigned job → **Start inspection**
- [ ] Complete building / pest / combined inspection form
- [ ] **Generate PDF report** — download works
- [ ] Edit completed inspection report — still editable
- [ ] Cannot open another inspector’s report (if test data exists)

---

## 5. Accounts & billing

Login: `accountant@sitescop-demo.com.au` or admin

- [ ] List invoices — filter and search
- [ ] Mark invoice paid (office) — job advances
- [ ] Send invoice email (if SMTP configured)

---

## 6. Admin & permissions

- [ ] Company admin **cannot** create Super Admin user (should error)
- [ ] Inspector **cannot** reschedule calendar (API returns forbidden)
- [ ] Inspector **cannot** delete jobs
- [ ] Super admin (`superadmin@sitescop.com.au`) — companies list (if seeded)

---

## 7. API health

```bash
curl http://localhost:3001/api/v1/health
```

- [ ] Returns `"status": "ok"` and `"phase": "6-complete"`

---

## 8. Before go-live (later — optional domain)

Skip until you choose a public domain.

- [ ] Set production `SESSION_SECRET` (32+ random characters)
- [ ] HTTPS enabled
- [ ] `WEB_APP_URL` set to public app URL
- [ ] Database backups scheduled
- [ ] Full tablet test on real device over HTTPS

---

## Sign-off

| Tester | Date | Pass / Fail | Notes |
|--------|------|-------------|-------|
| | | | |

When all sections 1–7 pass on localhost, **Phase 6 is complete** and you can start **Phase 7** (client portal, Stripe, auto-email PDFs).
