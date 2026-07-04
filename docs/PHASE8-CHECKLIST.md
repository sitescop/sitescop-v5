# Phase 8 — SMS (Twilio) Checklist

Run on **localhost** with `npm run dev`.

## Setup

1. Create a [Twilio](https://www.twilio.com/try-twilio) account (trial is fine for testing).
2. Add to `.env` in the project root:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+15005550006
```

Use your Twilio trial number or a purchased AU number in E.164 format (`+61…`).

3. Restart the API after changing `.env`.
4. Run migration if needed:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

5. **Settings → SMS** — enable **SMS notifications** and save.

## Health check

- [ ] `GET http://localhost:3001/api/v1/health` shows `"phase": "8-complete"` and `"sms": { "configured": true }`

## Test SMS

- [ ] **Settings → SMS** → enter your mobile → **Send test SMS**
- [ ] Trial accounts: verify the recipient number in Twilio Console first

## Automatic SMS triggers

Requires **SMS enabled** in Settings + valid **client mobile** on the contact.

| Event | Template key | When |
|-------|----------------|------|
| Agreement sent | `agreementSent` | Office sends agreement to client |
| Invoice sent | `invoiceSent` | Invoice emailed to client |
| Report ready | `reportReady` | PDF generated after inspection |
| Job reminder | `jobReminder` | Job scheduled/rescheduled on calendar |

- [ ] Send agreement to client with mobile → client receives SMS with signing link
- [ ] Reschedule a job on calendar → client receives reminder SMS
- [ ] Generate report → client receives report-ready SMS (once per generation)

## Templates

Edit JSON under **Settings → Templates → SMS Templates**, or use defaults in `apps/api/src/shared/sms/templates.ts`.

## Without Twilio

The app works normally; SMS is skipped with a log reason. Email and in-app notifications still work.

When sections above pass (or Twilio is intentionally skipped), **Phase 8 is complete** for localhost.
