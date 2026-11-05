# SCARS

Car rental website and admin for SCARS, Kigali. Built with Next.js.

```bash
npm install
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin
- Sign-in: set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` (copy `.env.example`), then restart the app. `.env` is never committed.

## Current stage: frontend only

There is no backend yet apart from the sign-in check. Admin data is stored in the browser's localStorage, so:

- Data exists only in the browser where it was entered.
- The password is checked on the server, but the signed-in state is only a browser flag, so this is not secure. Don't put this on the public internet with real data.
- Sample data is loaded on first open. Admin > Settings can restore it or delete it all.

## Where things are

| Path | What it holds |
|---|---|
| `app/(site)` | Public website |
| `app/admin` | Admin pages |
| `components/admin/charts.tsx` | Dashboard charts |
| `lib/config.ts` | WhatsApp number, contact details, pick-up places |
| `lib/db.ts` | All data access. Replace these functions with API calls to add the backend |
| `lib/auth.ts`, `app/api/admin/login` | Sign-in check against `.env`. Replace when the backend is added |
| `lib/metrics.ts` | Revenue, profit and booking calculations |
| `lib/seed.ts` | Sample data |

## How revenue is counted

Only paid records count as revenue, dated on the day the rental or driver service starts. Unpaid records that have started show as Unpaid. Cancelled bookings count for nothing.
