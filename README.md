# Japan Trip Companion — Starter v4

PWA / React + Vite prototype for the Japan 2026 family trip.

## v4: Supabase Auth + Admin proposals

New in this version:

- Supabase client setup under `src/lib/supabaseClient.ts`.
- Login screen with email/password and optional magic-link login.
- Role-based membership check from `trip_members`.
- Admin-only `/Admin` proposal form that writes to `change_proposals`.
- Viewer/editor users can log in and view the trip, but cannot create admin proposals.
- Supabase migration: `supabase/migrations/0001_trip_auth_and_proposals.sql`.
- Local membership helper: `supabase/local_members_template.sql`.

## Run the app locally without Supabase

```bash
npm install
npm run dev
```

Without `.env.local`, the site runs in Demo mode. This is useful for UI work only.

## Run locally with Supabase

You need Docker Desktop running.

```bash
npm install
npx supabase init
npx supabase start
```

`npx supabase start` prints local values. Copy the API URL and anon key into `.env.local`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=PASTE_LOCAL_ANON_KEY_HERE
```

Apply/reset the local database:

```bash
npx supabase db reset
```

Then restart Vite:

```bash
npm run dev
```

## Create local test users

Open Supabase Studio from the URL printed by `npx supabase start`, usually:

```text
http://127.0.0.1:54323
```

Create users under Authentication → Users:

- Elad — admin
- Gal — editor
- Riva — viewer
- Jacob — viewer

Use test passwords locally. Do not commit passwords to Git.

After the users exist, open `supabase/local_members_template.sql`, replace the placeholder emails, and run it in the Studio SQL editor.

## Test roles locally

Use separate browser sessions:

- Chrome normal window: Elad/admin
- Chrome incognito: Gal/editor
- Firefox/Safari: viewer users

Expected behavior:

- Admin sees Admin and can create a proposal.
- Editor/viewer can view trip pages.
- Editor/viewer cannot create proposals.
- A user that exists in Auth but not in `trip_members` sees a “not a member” screen.

## Important security rule

The frontend uses only the Supabase anon key. Never put the service-role key in Vite, `.env.local`, GitHub, or Cloudflare/Vercel frontend environment variables.

## Production later

After local testing works:

1. Create hosted Supabase project.
2. Push/apply the migration.
3. Create Auth users for the family.
4. Insert `trip_members` rows.
5. Deploy frontend to Cloudflare Pages or Vercel.
6. Add hosted `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as deployment environment variables.
