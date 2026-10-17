# Japan Trip Companion — v5 Supabase Publishing

React + Vite + TypeScript family trip website, protected by Supabase Auth and row-level security.

**Start with [UPGRADE_V5_HE.md](UPGRADE_V5_HE.md)** for careful steps in Hebrew.

## Key architecture changes

- The itinerary is no longer imported into client-side code: it is seeded into `trip_versions` via migration `0003_seed_initial_trip.sql` and read after authenticated trip membership verification.
- Migration `0002_publish_trip_snapshot.sql` provides an admin-only RPC with atomic version check and proposal status update.
- Admin can load the Oct 26 Tokyo Skytree proposal, POST it, preview changes, and publish the new snapshot. Family members see the latest published version on refresh, focus, or approximately every minute while online.
- The initial itinerary is v1, and the published Skytree proposal creates v2.
- The service worker caches only same-origin static files; it does **not** cache Supabase session data.

## Local setup

```bash
npm install
npx supabase start
npx supabase migration up --local
npm run dev
```

Requires a `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key). Existing users and membership records are retained with `migration up`. Do not run `db reset` on your established development database.

## Hosting

Push code to private GitHub repository. Use hosted Supabase, `npx supabase db push`, and Cloudflare Pages (`npm run build`, output `dist`). Use hosted Supabase URL and **publishable** API key in build environment. Configure the hosted Supabase Auth site/redirect URLs for your Cloudflare Pages domain.

Security: Never commit `.env.local`, `supabase/.temp`, passwords, QR tickets, or admin service role / secret keys. `trip_members` and Postgres RLS are the authorization controls; hiding the Admin tab is only UI convenience.

This project is an app starter, not a booking engine. Reservations aren't placed automatically.
