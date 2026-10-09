# ANU Mosquito

Campus food delivery for ANU students: students order from campus restaurants,
admins confirm payments and manage the menu, drivers deliver by batch.

- `frontend/` — React + Vite app (mobile-first). Hosted on GitHub Pages and compatible with Vercel.
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

## Hosting

The live GitHub Pages site is https://khaled-dotcom.github.io/anu-mosquito/.
The `Deploy to GitHub Pages` workflow builds `frontend/` and publishes it on
every push to `main` that changes the frontend or deployment workflow. Pages
must use **GitHub Actions** as its source under Settings → Pages.

To preview the GitHub Pages build locally:

```bash
cd frontend
npm run build -- --base=/anu-mosquito/
npm run preview
```

For Vercel, import this repository with **Root Directory** set to `frontend`,
**Framework Preset** set to Vite, **Build Command** set to `npm run build`, and
**Output Directory** set to `dist`. The default build uses `/` as its base, so
Vercel and GitHub Pages can deploy the same source.

Both hosts use the existing Supabase project. Optional overrides are
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; for GitHub Pages, add
these as repository Actions variables, and for Vercel, as project environment
variables. Use only the public publishable/anon key.

## Accounts

- **Students** sign up in the app with their 7-digit university ID.
- **Admins**: sign up as a student, then set `role = 'admin'` for that row in
  the `profiles` table (Supabase → Table Editor).
- **Drivers** are created by an admin in Admin → Drivers and log in with their
  7-digit driver ID.
