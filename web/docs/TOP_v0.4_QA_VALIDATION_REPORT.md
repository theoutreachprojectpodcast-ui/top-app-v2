# TOP v0.4 — Full QA functional validation report (deployed QA)

**Validation run:** 2026-04-19  
**Method:** Vercel CLI (`the-outreach-project` team), unauthenticated HTTP probes, local route-file smoke (code presence only).  
**Rule:** No subsystem is marked **Passed** for deployed QA unless this document cites a **live** check on that hostname. **Blocked** means an external gate (Vercel access, secrets, or human browser) prevented completion—not “unknown because we skipped it.”

---

## Final summary (required items 1–12)

| # | Item | Result |
|---|------|--------|
| **1** | **QA URL tested** | **Failed** (stable QA). **Blocked** (git-qa + deployment URLs) for unauthenticated automation — see §1.1. |
| **2** | **Branch / environment tested** | **Partial:** Preview deployment **Ready**; branch inferred **`qa`** from alias `…-git-qa-…`; commit SHA not exported in `vercel inspect --json` snippet used. Env scope **Preview (git branch `QA`)** has variable **names** listed; values **not** verified. |
| **3** | **WorkOS** | **Blocked** — cannot load HTML or `/callback` through unauthenticated HTTP; no browser session executed. |
| **4** | **Database** | **Blocked** — no live `GET /api/me` or authenticated mutations observed; no Supabase QA project queried. |
| **5** | **Enrichment (by target)** | **Blocked** — see §5 “Intended enrichment targets (code map).” No `POST` to enrichment routes executed on QA. |
| **6** | **Backend / API** | **Blocked** for deployed QA (401 at edge). **Passed** only for **repository** route-file presence (`smoke:routes`). |
| **7** | **End-to-end user flows** | **Blocked** — same as (3)(4)(5). |
| **8** | **Issues fixed (this run)** | **None** in application code during this validation pass. In-repo tooling from prior work: `web/scripts/qa-http-smoke.mjs`, `pnpm --dir web run smoke:qa:http`. |
| **9** | **Remaining blockers** | Stable QA **404**; preview **401** without Vercel team login or **Protection Bypass for Automation**; encrypted env values not audited for URL/callback parity. |
| **10** | **Manual config still required** | Attach **`qa-the-outreach-project.vercel.app`**; align `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WORKOS_REDIRECT_URI` with the hostname reviewers use; WorkOS redirect URIs; optional bypass secret for CI; **Production** env still **empty** (separate from QA). |
| **11** | **Ready for product review?** | **No** — reviewers cannot rely on stable QA URL today; automated/human QA of the app behind protection not completed in this run. |
| **12** | **Ready to promote to production after approval?** | **No** — production env vars absent; QA E2E not proven. |

---

## §1.1 — URLs exercised (evidence)

| URL | HTTP status (no cookies, no bypass header) | Conclusion |
|-----|--------------------------------------------|------------|
| `https://qa-the-outreach-project.vercel.app/` | **404** | **Failed** — documented “stable QA” does not serve this project’s deployment from the public internet probe used here. |
| `https://the-outreach-project-app-git-qa-the-outreach-project.vercel.app/` | **401** | **Blocked** for automation — [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection); app not reached. |
| `https://the-outreach-project-9s9ib97mg-the-outreach-project.vercel.app/` | **401** | Same — latest **Ready** deployment from `vercel ls` at validation time. |

**Reference deployment (CLI):**

- **id:** `dpl_AFYkMqeFMrXsugHUsTNUenyeantT`
- **target:** `preview`
- **readyState:** `READY`
- **alias:** `the-outreach-project-app-git-qa-the-outreach-project.vercel.app`
- **Build (inspect JSON):** `framework: "nextjs"`, `installCommand` / `buildCommand` / `outputDirectory: ".next"` — consistent with **`web/`** as project root on Vercel.

---

## Phase 1 — True QA wiring (what we can prove without secrets)

| Topic | Evidence | Status |
|-------|----------|--------|
| **Vercel project** | `the-outreach-project-app`, team `the-outreach-project` | **Passed** (CLI) |
| **QA stable hostname in docs** | `qa-the-outreach-project.vercel.app` | **Failed** (404 to `/`) |
| **Git-connected preview alias** | Hostname contains `git-qa` | **Passed** (inferred branch **`qa`**) |
| **Preview env (branch `QA`) — variable names** | See table below | **Passed** (names only) |
| **Production env** | `vercel env ls production` | **Empty** — **Passed** (observation); implies prod not configured |
| **WorkOS callback / app URLs in runtime** | Values encrypted | **Blocked** — must match actual QA origin in dashboard |
| **Supabase project** | `NEXT_PUBLIC_SUPABASE_URL` encrypted | **Blocked** — cannot confirm QA vs prod project ID |
| **Enrichment “services”** | In-process Next routes + outbound HTTP + Supabase admin | **Blocked** — not exercised on QA |
| **Separation QA vs prod** | Preview has keys; Production has none | **Passed** for Vercel variable **presence**; **Blocked** for proving separate Supabase/WorkOS **values** |

### Preview (`QA`) — environment variable **names** (values encrypted)

`NEXT_PUBLIC_WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL`, Stripe keys/prices, `NEXT_PUBLIC_SUPABASE_*`.

---

## Phase 2 — Smoke test (deployed QA, live)

| Check | Result |
|-------|--------|
| App shell loads (HTML 200) | **Failed / Blocked** — 404 or 401 only |
| Routes resolve | **Not executed** on live app |
| Navigation | **Not executed** |
| Runtime / assets | **Not executed** (no browser) |
| Deployment misconfiguration | **Failed** stable QA 404; preview protected (401) |

---

## Phase 3 — WorkOS (deployed QA)

| Test | Result |
|------|--------|
| Sign up / login / logout / refresh | **Blocked** |
| Callback / redirect | **Blocked** |
| User provisioning / profile linkage | **Blocked** |

**Root cause for “not tested”:** Requests do not reach the Next.js app without **Vercel Authentication** session or **`x-vercel-protection-bypass`** (and stable QA 404 prevents using that hostname at all).

---

## Phase 4 — Database persistence (deployed QA)

| Test | Result |
|------|--------|
| User row after signup | **Blocked** |
| Profile CRUD | **Blocked** |
| Community / nonprofit persistence | **Blocked** |

**Required to pass later:** Authenticated flows + Supabase QA project verification (SQL or dashboard) for the same deployment origin.

---

## Phase 5 — Enrichment (deployed QA)

### Intended enrichment targets (code map — not live-validated)

| Trigger / API | Primary write targets (from code) | Deployed QA status |
|---------------|-----------------------------------|-------------------|
| `POST /api/nonprofit/enrich` | `nonprofit_directory_enrichment`, optional `nonprofit_profiles` | **Blocked** |
| `POST /api/sponsors/enrich` | `sponsor_enrichment`, `sponsors_catalog` fields | **Blocked** |
| `POST /api/admin/sponsors/logo-enrichment` | DB + storage (logo) | **Blocked** |
| `POST /api/admin/orgs/header-image` | `nonprofit_directory_enrichment` + org header storage | **Blocked** |

**Definition of “pass” for a future run:** For each applicable flow, moderator/auth as required → successful response → **verified row updates** in the listed tables (and storage URLs where applicable), not only HTTP 200.

---

## Phase 6 — Backend / server health (deployed QA)

| Scope | Result |
|-------|--------|
| Live `GET /api/me`, `GET /api/auth/status` | **Blocked** (401 at edge) |
| Auth-protected mutations | **Blocked** |
| Repository contains expected `route.js` files | **Passed** — `pnpm --dir web run smoke:routes` → OK (14 files) |

---

## Phase 7 — End-to-end user workflows (deployed QA)

**Blocked** — same gates as Phases 3–5.

---

## Phase 8 — Failure / degraded behavior (deployed QA)

| Topic | Result |
|-------|--------|
| App-level empty/error states | **Not tested** (app not loaded) |
| Platform: 401 on preview | **Observable** — Vercel protection; distinguish from WorkOS **401** inside the app |

---

## Phase 9 — Retest loop, fixes, automation

### Retest when unblocked

1. Fix **stable QA 404** (domains) **or** standardize on git-qa URL for review.
2. Use **team browser** on preview **or** set `VERCEL_AUTOMATION_BYPASS_SECRET` and run:

```bash
cd web
QA_BASE_URL="https://the-outreach-project-app-git-qa-the-outreach-project.vercel.app" \
VERCEL_AUTOMATION_BYPASS_SECRET="<from Vercel Deployment Protection>" \
pnpm run smoke:qa:http
```

Expect: **`GET /api/me`** → **200** with JSON; **`authenticated`** may be **false** when logged out.

3. Repeat Phases 3–7 in browser on the **same** origin as `NEXT_PUBLIC_WORKOS_REDIRECT_URI`.

### In-repo tooling (already present)

- `web/scripts/qa-http-smoke.mjs` — HTTP smoke with optional bypass header.
- `web/scripts/smoke-routes.mjs` — ensures critical route **files** exist (not a substitute for deployed QA).

---

## Appendix — Commands and probes (reproducible)

```text
pnpm exec vercel ls the-outreach-project-app --scope the-outreach-project
pnpm exec vercel inspect the-outreach-project-9s9ib97mg-the-outreach-project.vercel.app --scope the-outreach-project [--json]
pnpm exec vercel env ls preview QA --scope the-outreach-project
pnpm exec vercel env ls production --scope the-outreach-project
pnpm --dir web run smoke:routes
```

PowerShell: `Invoke-WebRequest` to the three URLs in §1.1 (results: **404**, **401**, **401**).

---

## Conclusion

The deployed **Preview** build for the **`qa`** branch alias is **Ready** on Vercel and uses a **Next.js** build configuration, and **Preview (`QA`)** environment variable **names** are present. **Stable QA** hostname **does not respond** with this app (**404**), and **all** tested preview URLs return **401** without Vercel access or bypass—so **WorkOS, Supabase persistence, enrichment writebacks, and E2E flows cannot be marked Passed for deployed QA** in this run.

**Next step for a trustworthy release candidate:** Unblock access (domain + protection policy), then execute Phases 2–8 on the live origin and update this document with dated evidence (screenshots, API response snippets, and Supabase row checks) per subsystem.
