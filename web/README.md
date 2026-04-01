# The Outreach Project (Next Foundation)

This folder contains the Phase 2 modern foundation for `top-app-v2` using Next.js.

## Phase Purpose

- Establish a production-ready React/Next structure.
- Keep the original static MVP intact while migrating feature-by-feature.
- Introduce environment-based Supabase configuration.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file from template:

```bash
cp .env.local.example .env.local
```

3. Fill in values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Route Skeleton (Phase 2)

- `/` Home foundation page
- `/trusted` Trusted placeholder
- `/profile` Profile placeholder
- `/contact` Contact placeholder

## Key Files

- `src/components/layout/AppShell.js` base shell + nav
- `src/lib/supabase.js` centralized Supabase client bootstrap
- `src/lib/constants.js` app-level constants
- `src/app/globals.css` global app styling baseline

## Verification

- App starts without runtime errors.
- Bottom nav routes load.
- Layout renders consistently across routes.
- Supabase client helper returns `null` gracefully when env vars are missing.
