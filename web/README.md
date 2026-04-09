# The Outreach Project (Next Foundation)

This folder contains the Phase 2 modern foundation for `top-app-v2` using Next.js.

## Phase Purpose

- Establish a production-ready React/Next structure.
- Keep the original static MVP intact while migrating feature-by-feature.
- Introduce environment-based Supabase configuration.

## Setup

### Windows + PowerShell (`pnpm` fails or “running scripts is disabled”)

PowerShell runs **`pnpm.ps1`** (Corepack) before **`pnpm.cmd`**. If execution policy blocks scripts, `pnpm` breaks even though Node is fine.

**Fix (pick one):**

1. **One-time policy for your user** (usual fix):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

2. **Always use the CMD shim** (no policy change): run `pnpm.cmd install` instead of `pnpm install` (same for every subcommand).

3. **This repo**: Cursor/VS Code defaults to **“PowerShell + pnpm (full repo)”** (see `.vscode/settings.json`). If you opened only the `web` folder as the workspace, switch the terminal profile to **“PowerShell + pnpm (web is workspace root)”**. Or, from an external PowerShell window, dot-source once per session:

```powershell
# Workspace = repo root (top-app-v2)
Set-Location C:\path\to\top-app-v2
. ./scripts/pnpm-powershell.ps1

# Or, from anywhere under the repo, the loader also works:
. ./web/scripts/pnpm-powershell.ps1
```

(then `pnpm` calls `pnpm.cmd`).

4. **Align Corepack with this project** (optional but recommended):

```powershell
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

---

**Then (all platforms):**

Work from the **repository root** (parent of `web/`). The workspace is defined there.

1. Install dependencies:

```bash
pnpm install
```

2. Create env file from template (paths are relative to `web/`):

```bash
cp web/.env.local.example web/.env.local
```

3. Fill in values in `web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Run the dev server (**canonical**):

```bash
pnpm dev
```

Opens **http://localhost:3000**. If port 3000 is in use, free it or run `pnpm --filter web dev:alt` for port 3001.

**Windows:** Use a **space**: `pnpm dev` (not `pnpm` + `dev` merged into one token). Double-click **`web/dev.cmd`** to run `pnpm dev` from the repo root.

**Do not** use `npm run dev` at the repository root — there is no npm package there. Only **`pnpm dev`** from the root is supported for the full product.

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

## Community (tORP v0.3)

Supabase-backed community posts, moderation statuses, RLS, and API routes are documented in [`docs/COMMUNITY_v0.3.md`](docs/COMMUNITY_v0.3.md).

## Billing — Stripe + persistent profiles (tORP v0.3)

WorkOS identity, Supabase `torp_profiles`, Checkout, webhooks, and Customer Portal are documented in [`docs/BILLING_STRIPE_v0.3.md`](docs/BILLING_STRIPE_v0.3.md).

## WorkOS CLI

From `web/`: `pnpm workos` runs `pnpm dlx workos@latest` (Node **≥ 20.20** required; avoids some Windows `npx`/Node mismatches). See [`docs/WORKOS_CLI.md`](docs/WORKOS_CLI.md).
