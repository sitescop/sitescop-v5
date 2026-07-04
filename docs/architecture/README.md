# SiteScop V5 Architecture

## Phase status

| Phase | Module | Status |
|-------|--------|--------|
| 0 | Foundation (auth, design system, RBAC) | Complete |
| 1 | Jobs, CRM, Settings, Admin | Complete |
| 2 | Agreements (send, sign, tablet flow) | Complete |
| 3 | Inspections, Room Engine (building) | Complete |
| 4 | Pest & Combined inspections | Complete |
| 5 | Reports, Calendar | Complete |
| 6 | Notifications, Accounts, global search, security pass | Complete |
| 7 | Client portal, Stripe, auto-email PDFs | Complete |
| 8 | SMS notifications (Twilio) | Complete |

## Calendar (Phase 5)

- Month view of scheduled jobs
- Inspector filter (office roles)
- Schedule / reschedule jobs (`calendar:manage`)
- Unscheduled jobs list

## Phase 6 — complete (localhost)

- **Global search** — top bar (`Ctrl+K`)
- **Security pass** — role escalation, inspector scoping, auth rate limits (see `PHASE6-CHECKLIST.md`)
- **E2E test checklist** — `docs/PHASE6-CHECKLIST.md`
- **Go-live / domain** — deferred until you choose a public URL (`DEPLOYMENT.md`)

## Phase 8 — complete (localhost)

- **Twilio SMS** — agreement, invoice, report-ready, job reminder (see `PHASE8-CHECKLIST.md`)
- **Settings → SMS** — enable per company, test send, template JSON
- **Audit** — `sms_messages` table logs outbound SMS

## Deferred

- **Go-live** — ready via Docker; see [GO-LIVE.md](./GO-LIVE.md)
