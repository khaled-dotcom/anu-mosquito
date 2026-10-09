# ANU Mosquito

Campus food delivery for ANU students: students order from campus restaurants,
admins confirm payments and manage the menu, drivers deliver by batch.

- `frontend/` — React + Vite app (mobile-first). Deployed on Vercel.
- `supabase/migrations/` — database schema, security rules and order logic.
- `supabase/functions/` — edge functions: `student-auth` (sign-up),
  `driver-login`, `create-driver`, `update-driver`, `delete-driver`.

## Run locally

```bash
cd frontend
npm install
npm run dev -- --host
```

On Windows PowerShell use `npm.cmd` instead of `npm` if scripts are blocked.

The app connects to the Supabase project set in `frontend/src/supabase.js`
(URL + public anon key). To point it at another project, set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

## Accounts

- **Students** sign up in the app with their 7-digit university ID.
- **Admins**: sign up as a student, then set `role = 'admin'` for that row in
  the `profiles` table (Supabase → Table Editor).
- **Drivers** are created by an admin in Admin → Drivers and log in with their
  7-digit driver ID.
