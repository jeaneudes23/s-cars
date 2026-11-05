# SCARS

Car rental website and admin for SCARS, Kigali. Built with Next.js.

## Setup

1. Create a free database at [MongoDB Atlas](https://www.mongodb.com/atlas) and copy its connection string.
2. Copy `.env.example` to `.env` and fill it in.
3. Run:

```bash
npm install
npm run seed
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin

`npm run seed` adds the starting 8 cars to an empty database and does nothing otherwise.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` only create the admin on the first sign-in. After that, the sign-in lives in MongoDB and is changed under Admin > Settings.

The live site on Vercel needs the same three values in its project settings.

## Where things are

| Path | What it holds |
|---|---|
| `app/(site)` | Public website |
| `app/admin` | Admin pages |
| `components/admin/charts.tsx` | Dashboard charts |
| `lib/config.ts` | WhatsApp number, contact details, pick-up places |
| `lib/db.ts`, `lib/auth.ts` | How the browser talks to the server |
| `lib/server/records.ts` | What each record may contain, car clashes, delete rules, photos |
| `lib/server/auth.ts` | Passwords, sessions, sign-in lockout |
| `lib/metrics.ts` | Revenue, profit and booking calculations |
| `scripts/seed-cars.mjs` | The starting fleet |

## How revenue is counted

Only paid records count as revenue, dated on the day the rental or driver service starts. Unpaid records that have started show as Unpaid. Cancelled bookings count for nothing.
