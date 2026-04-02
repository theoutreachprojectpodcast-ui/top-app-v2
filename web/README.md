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

1. Install dependencies:

```bash
pnpm install
```

(If you do not use pnpm, `npm install` still works for this package.)

2. Create env file from template:

```bash
cp .env.local.example .env.local
```

3. Fill in values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Run development server:

```bash
pnpm dev
```

**Windows:** There must be a **space** between `pnpm` and `dev`. The command is **`pnpm dev`**, not `pnpm cmd.dev` (that looks for a non-existent command named `cmd.dev`). If you prefer the long form: **`pnpm run cmd.dev`** — we ship a script with that name as an alias.

Or double-click **`dev.cmd`** in this folder (uses `pnpm run dev`).

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
