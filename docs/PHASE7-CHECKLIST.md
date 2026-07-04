# Phase 7 — Client Portal Checklist

Run on **localhost** with `npm run dev` (web `:5173`, API `:3001`).

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Client | `client@sitescop-demo.com.au` | `SiteScop2026!` |
| Admin | `admin@sitescop-demo.com.au` | `SiteScop2026!` |

Re-seed if portal data is empty or emails mismatch:

```bash
cd apps/api && npm run db:seed
```

## 1. Client portal access

- [ ] Sign in as **client@sitescop-demo.com.au** → lands on `/portal` (not dashboard)
- [ ] Sidebar shows **My Portal** only (no Dashboard, Jobs, etc.)
- [ ] Portal lists **2 agreements**, **2 invoices**, summary cards load

## 2. Agreements & invoices

- [ ] Agreements tab shows signed + sent agreements for Sarah Mitchell
- [ ] Invoices tab shows paid invoice (JOB-0001) and unpaid sent invoice (JOB-0002)
- [ ] Without Stripe configured, unpaid invoice shows bank-transfer info banner

## 3. Reports

- [ ] Reports tab empty until an inspection report is generated (expected for seed)
- [ ] As admin/inspector: complete inspection → generate report → client portal shows report with **Download**

## 4. Auto-email PDFs (SMTP)

- [ ] Configure SMTP (Mailpit: `SMTP_HOST=localhost`, `SMTP_PORT=1025`)
- [ ] Generate a report for a completed inspection
- [ ] Client receives `reportReady` email with PDF attached (check Mailpit at `:8025`)

## 5. Stripe (optional)

- [ ] Set `STRIPE_SECRET_KEY=sk_test_...` in `.env` and restart API
- [ ] Health `GET /api/v1/health` shows `stripe.configured: true`
- [ ] Client portal shows **Pay online** on unpaid invoice
- [ ] Checkout completes → return URL confirms payment → invoice marked **Paid**

## 6. Security

- [ ] Non-client users cannot access `GET /api/v1/portal` (403)
- [ ] Client cannot download another client's report by ID guessing (404)

When sections 1–4 pass (and 5 if using Stripe), **Phase 7 is complete** for localhost.
