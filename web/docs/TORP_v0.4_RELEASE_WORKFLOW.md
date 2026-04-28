# TOP v0.4 — Vercel + GitHub Deployment Workflow

This workflow keeps local development stable while providing a clear QA gate before production.

## Phase 1 — Deployment audit (current state)

Use this section as the source of truth before changing Vercel or GitHub settings.

| Item | Actual state |
|------|----------------|
| **Vercel project** | `the-outreach-project-app` (`prj_J4sKLVAI6W7AQTLs771nGBLwx8LH`), team `the-outreach-project` |
| **Repo link (CLI)** | Local `.vercel/project.json` points at this project (gitignored) |
| **Git remote** | `https://github.com/theoutreachprojectpodcast-ui/top-app-v2.git` |
| **Production branch** | `main` (matches `origin/main`; confirm in Vercel **Git → Production Branch**) |
| **QA branch** | `QA` exists on `origin` (same commit as `main` at last audit) |
| **`qa` branch (lowercase)** | Day-to-day development branch. Open PRs **`qa` → `QA`**. Create on `origin` if missing: `git checkout -b qa origin/main` then `git push -u origin qa`. The old **`prototype`** branch is no longer used. |
| **Vercel Root Directory** | Still **`.`** (repo root) in project settings — Next app is in **`web/`**. **Change to `web`** in the dashboard. |
| **Framework preset** | Still **Other** with generic output — **set to Next.js** after Root Directory is `web`. |
| **Production env (Vercel)** | **None** — add all required variables for `Production` before relying on `main` deploys. |
| **QA env (Vercel)** | **Preview, branch `QA`** — required keys present (values encrypted in dashboard); update `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WORKOS_REDIRECT_URI` when **`qa-the-outreach-project.vercel.app`** is attached. |
| **Config in repo** | Root `vercel.json`: `pnpm install` + `pnpm --filter web build`. `web/vercel.json`: monorepo install from parent + `pnpm run build` (used when Root Directory is `web`). |

## Current State (summary)

- Vercel project in use: `the-outreach-project-app` (team: `the-outreach-project`)
- GitHub remote: `https://github.com/theoutreachprojectpodcast-ui/top-app-v2.git`
- Production branch: `main` — **production env vars must still be added in Vercel**
- QA branch: `QA` — **preview env for branch `QA` is populated**; stable QA hostname is **`qa-the-outreach-project.vercel.app`** (add in Domains if not already)
- **Blocking reliable Git → Vercel builds:** dashboard **Root Directory = `web`** + **Framework = Next.js** (CLI `project inspect` still shows legacy “Other” + root `.`)

## Branch and Environment Model

- `qa` (lowercase) -> active development / integration branch
- `QA` -> staging/QA validation branch (Vercel Preview)
- `main` -> production branch (Vercel Production)

Required PR flow:

1. `qa` -> `QA`
2. `QA` -> `main`

`pr-branch-flow.yml` enforces the intended PR targets.

## Local Development (source of truth)

From repo root:

```bash
pnpm install
pnpm dev
```

Fallback if port 3000 is busy:

```bash
pnpm --filter web dev:alt
```

## CI Validation

Automated in `.github/workflows/ci.yml` on PRs and pushes to `qa`, `QA`, and `main`:

- install with pinned pnpm
- lint (`pnpm lint`)
- route smoke check (`pnpm --dir web run smoke:routes`)
- build (`pnpm build`)

## Vercel Project Mapping

Two layouts are supported:

- **Git + dashboard (recommended):** set **Root Directory** to `web`. Vercel reads `web/vercel.json` for install/build. Install runs from the repo root (`cd ..`) so the workspace lockfile resolves; build runs `pnpm run build` inside `web` (Next.js).
- **CLI from repo root:** root `vercel.json` uses `pnpm install --frozen-lockfile` and `pnpm --filter web build`. Prefer aligning the Vercel project **Root Directory** with `web` so preview/production URLs use the same Next.js pipeline as the docs above.

### Required Vercel Dashboard settings (one-time)

These are required because current project settings are still pointed at root-level generic config:

1. **Project Settings -> General -> Root Directory**: set to `web`
2. **Project Settings -> Build & Development Settings -> Framework Preset**: set to `Next.js`
3. **Project Settings -> Git -> Production Branch**: confirm `main`
4. **Project Settings -> Git -> Ignored Build Step**: leave empty unless intentionally used

Without (1) and (2), Vercel cannot reliably detect Next.js for Git-based builds.

### If you see `404: NOT_FOUND` / `Code: NOT_FOUND` (Vercel edge)

Official reference: [NOT_FOUND](https://vercel.com/docs/errors/not_found.md) and related [DEPLOYMENT_NOT_FOUND](https://vercel.com/docs/errors/DEPLOYMENT_NOT_FOUND.md).

Typical causes for this repo:

- **Stale or mistyped preview URL** — each deployment has its own `*.vercel.app` hostname; old deployments can be removed or superseded.
- **Wrong project / domain** — hostname not attached to this project.
- **Deployment “succeeded” but output was not a valid Next deployment** — e.g. treating `web/.next` as a static `outputDirectory` while the project preset was not Next.js. Fix: **Root Directory = `web`**, **Framework = Next.js**, use `web/vercel.json` (no manual `outputDirectory` for `.next`).

### If you see: `No Output Directory named "public" found`

Vercel is still treating the project like a **static “Other”** preset with default **Output Directory = `public`**. This repo has **`web/public`**, not **`public`** at the monorepo root, so the deploy step fails after `next build`.

**In-repo override:** root `vercel.json` sets `"outputDirectory": "web/.next"`; `web/vercel.json` sets `"outputDirectory": ".next"` when **Root Directory** is `web`. That unblocks deploys that still use the wrong dashboard preset.

**Proper long-term fix:** **Project → Settings → General → Root Directory:** `web`, **Framework:** **Next.js**, and clear any custom output directory so Vercel uses the **Next.js builder** (it does not rely on a root-level `public` folder the same way static presets do).

## QA URL strategy (stable hostname)

**Canonical QA site:** [https://qa-the-outreach-project.vercel.app](https://qa-the-outreach-project.vercel.app)

Use this as the single review URL instead of bookmarking per-deployment preview hostnames.

**Evidence-based QA runs:** [TORP_v0.4_QA_VALIDATION_REPORT.md](./TORP_v0.4_QA_VALIDATION_REPORT.md) (HTTP probes, env names, blockers). After Deployment Protection is configured, use `pnpm --dir web run smoke:qa:http` with `QA_BASE_URL` and optional `VERCEL_AUTOMATION_BYPASS_SECRET`.

### One-time setup (Vercel dashboard — project owner)

The domain must be attached to **`the-outreach-project-app`** on team **`the-outreach-project`**. CLI `vercel domains add` requires permission; if you see **403**, use the dashboard as a team **Owner** / **Admin**.

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → team **The Outreach Project** → project **`the-outreach-project-app`**.
2. **Settings → Domains → Add** → enter `qa-the-outreach-project.vercel.app`.
3. When Vercel offers **environment / branch** options, tie the domain to **Preview** and restrict to Git branch **`QA`** (so production on `main` is unchanged). If the UI only offers Production vs Preview, use **Preview** and rely on only merging `QA` when you want that hostname updated, or use Vercel’s **branch domain** / domain assignment docs for your plan tier.
4. After the domain is verified, **redeploy** the latest `QA` branch (or wait for the next push) so traffic hits a **Ready** deployment.

### Optional CLI (same team member with domain permission)

From repo root after `pnpm install` (Vercel CLI is a **root devDependency**; use `pnpm exec vercel` or `pnpm run vercel --`). Without `node_modules`, `pnpm dlx vercel` still works.

```bash
pnpm exec vercel domains add qa-the-outreach-project.vercel.app --scope the-outreach-project
```

Then point the alias at the deployment you want (updates when you re-run after each QA deploy):

```bash
pnpm exec vercel alias set <deployment-hostname>.vercel.app qa-the-outreach-project.vercel.app --scope the-outreach-project
```

Replace `<deployment-hostname>` with the hostname of the latest **Ready** Preview deployment for `QA` (from **Deployments**).

### Environment + WorkOS (required when QA hostname is live)

For Vercel **Preview** env scoped to branch **`QA`**, set at least:

| Variable | Value |
|----------|--------|
| `APP_BASE_URL` | `https://qa-the-outreach-project.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://qa-the-outreach-project.vercel.app` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `https://qa-the-outreach-project.vercel.app/callback` |

In the **WorkOS** dashboard, add the same redirect URI to the QA application.

### Fallback URLs (still valid)

Per-deployment previews continue to work, e.g. `https://the-outreach-project-app-git-qa-<hash>-the-outreach-project.vercel.app`, but **`qa-the-outreach-project.vercel.app`** is the stable name for QA review.

## Required Environment Variables

Set these in **both** `Preview` (branch `QA`) and `Production` (`main`) as appropriate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `WORKOS_COOKIE_PASSWORD`
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI`

Also set billing keys if billing flows are enabled:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_MEMBER_MONTHLY`
- `STRIPE_PRICE_SUPPORT_MONTHLY`

### CLI examples

```bash
pnpm exec vercel env ls preview QA
pnpm exec vercel env ls production
pnpm exec vercel env add NEXT_PUBLIC_SUPABASE_URL production
pnpm exec vercel env add NEXT_PUBLIC_SUPABASE_URL preview QA
```

## Release Checklist

1. Merge `qa` -> `QA` and wait for Preview deploy.
2. QA test key flows (auth, profile, community, sponsors, trusted resources, billing if enabled).
3. Merge `QA` -> `main`.
4. Verify production deploy and health checks.
5. If mobile wrappers are used, update `CAP_SERVER_URL` for QA/production as needed.

---

## Phase 2 — Local build readiness (verified)

- **Dev:** from repo root, `pnpm install` then `pnpm dev` (see `web/README.md`).
- **Production build:** `pnpm build` (runs `pnpm --filter web build`).
- **`web` prebuild:** `validate-production-env.mjs` runs strict on `CI`, `VERCEL`, or `TOP_VALIDATE_ENV=1`; locally it warns unless `.env.local` supplies vars.
- **CI:** `.github/workflows/ci.yml` supplies dummy env for `pnpm build` on PRs and on push to `QA`, `main`, `qa`.

## Phase 3–4 — GitHub ↔ Vercel integration

- **Automatic deploys** are controlled in Vercel **Project → Git** (connected repo: `theoutreachprojectpodcast-ui/top-app-v2`). Confirm **Production Branch** = `main` and that Preview deployments are enabled for PRs / non-production branches.
- **Recommended dashboard settings:** Root Directory **`web`**, Framework **Next.js**, Install/Build from **`web/vercel.json`** (or override in UI to match).
- **QA URL:** stable hostname **`https://qa-the-outreach-project.vercel.app`** (Domains + Preview / branch `QA`); per-deploy previews remain available as `…-git-qa-…vercel.app`.

## Phase 5 — GitHub workflow alignment

- **CI:** lint, route smoke (`smoke:routes`), build on PR and on push to `QA`, `main`, `qa`.
- **PR flow guard:** `qa` → `QA`, `QA` → `main`. Develop on branch **`qa`**, then open a PR into **`QA`** for staging review.

## Phase 6 — Environment variables

### Required for deploy builds (`validate-production-env.mjs` + `VERCEL`/`CI`)

Same set for **Production** and **Preview (QA)** in Vercel, with **different values** per environment:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`
- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`

### Billing (when Checkout / Portal / webhooks are used)

- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_MEMBER_MONTHLY`, `STRIPE_PRICE_SUPPORT_MONTHLY`, and `STRIPE_WEBHOOK_SECRET` where applicable (see `web/src/lib/billing/stripeConfig.js`).

### Optional / feature-specific (documented in code, not all in validator)

Examples: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `WORKOS_COOKIE_NAME`, `STRIPE_PRICE_*` variants, `NEXT_PUBLIC_COMMUNITY_MODERATOR_*`, `COMMUNITY_MODERATOR_*`, `CAP_SERVER_URL`, `GOOGLE_CUSTOM_SEARCH_*`, storage buckets, etc. Set in Vercel only if that feature is used in that environment.

## Phase 7 — Live verification checklist

After dashboard and env updates:

- [ ] `main` deployment **Ready** and production URL loads (not Vercel `NOT_FOUND`).
- [ ] `QA` branch deployment **Ready**; **`qa-the-outreach-project.vercel.app`** (if configured) matches latest QA.
- [ ] WorkOS redirect URIs registered for production + QA origins.
- [ ] Spot-check: `/`, `/profile`, `/api/me` (auth), static assets.

### Admin entrypoint + endpoint scope (v0.4 decision)

Admin UI stays isolated under `/admin/*` with platform-admin route gating. Public/member-facing routes remain available where needed (for normal product behavior), while privileged actions use explicit scope checks.

Decision map:

- **Platform-admin only:** `/api/admin/*` endpoints, sponsor/logo/trusted/directory/user management, admin enrichment summary.
- **Moderator scope (non-admin route, intentional):** community moderation actions in `/api/community/posts` pending flow and `/api/community/posts/[id]` approve/reject/hide/edit.
- **Platform-admin within non-admin route (intentional split):** bookmark/follow-up actions in `/api/community/posts` and `/api/community/posts/[id]`.
- **Moderator scope (operational workflows):** `/api/nonprofit/enrich`, `/api/sponsors/enrich`, `/api/podcasts/sync-youtube`, notification trigger moderation helpers.

Rationale:

- Community moderation and enrichment operations are role-based workflows and do not require platform-admin by default.
- Organization-wide administration (directory edits, user role changes, trusted/sponsor catalog management) is restricted to platform-admin endpoints under `/api/admin/*`.
- Admin UI remains separate from public/member routes.

### QA + production verification checklist (admin and responsive)

- [ ] `/admin` and all admin child routes load only for platform-admin users.
- [ ] Logged-out and logged-in navigation work on mobile (320/375/390/430), tablet (768/820/1024), desktop (>=1280).
- [ ] No horizontal overflow on home/profile/settings/community/sponsors/trusted/nonprofit detail/podcast pages.
- [ ] Modals are fully usable on mobile (scrollable body, accessible close action, no clipped footer actions).
- [ ] Admin tables/toolbars/forms are usable on mobile/tablet (stacked controls, readable rows/actions).
- [ ] Community submit/moderation flows remain functional across breakpoints.
- [ ] Auth/account/billing flows still function after responsive changes (`/api/me`, onboarding, profile/settings).
- [ ] QA build passes and route smoke remains green.

---

## Phase 8 — Deployment summary (handoff)

1. **Vercel project name:** `the-outreach-project-app` (team `the-outreach-project`).
2. **Production branch:** `main`.
3. **QA / staging branch:** `QA`.
4. **QA deployment URL (stable):** `https://qa-the-outreach-project.vercel.app` (after Domains setup); fallback per-deploy: `https://the-outreach-project-app-git-qa-<slug>-the-outreach-project.vercel.app`.
5. **Production deployment URL:** `https://the-outreach-project-app-the-outreach-project.vercel.app` (and any custom production domain configured on the project).
6. **Vercel settings to configure:** Root Directory **`web`**, Framework **Next.js**, Production branch **`main`**, Preview env for **`QA`**, Production env vars filled, optional domain **`qa-the-outreach-project.vercel.app`** on Preview/branch `QA`.
7. **GitHub integration:** Repository connected in Vercel; workflows `ci.yml` + `pr-branch-flow.yml`; use branch **`qa`** for dev integration PRs into **`QA`**.
8. **Required env vars:** see Phase 6 (mirror QA vs production values; no secrets in git).
9. **Future deployments:** work on **`qa`** → PR **`qa` → `QA`** → validate on QA URL → PR **`QA` → `main`** → verify production.
10. **Manual steps only you can do:** Vercel dashboard (Root Directory, framework, domains, Production env vars), WorkOS/Stripe dashboards for redirect URLs and keys.
