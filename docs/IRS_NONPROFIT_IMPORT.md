# IRS Nonprofit Directory Import

## Classification: what “5019a” means

**`5019a` is not a valid IRS exempt-organization code.**

For The Outreach Project (veteran / military focus), it is interpreted as:

| Requested | Interpreted as | EO BMF field | Value |
|-----------|----------------|--------------|-------|
| `5019a` | **IRC §501(c)(19)** veterans' organizations | `SUBSECTION` | `19` |

Where this lives in IRS data:

- Official extract: [Exempt Organizations Business Master File (EO BMF)](https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf)
- Code definitions: [eo-info.pdf](https://www.irs.gov/pub/irs-soi/eo-info.pdf) — Table of EO Subsection and Classification Codes lists **19 / 1 — Post or Organization of War Veterans**
- CSV files: `https://www.irs.gov/pub/irs-soi/eo_{state}.csv` (e.g. `eo_dc.csv`)

Rejected alternatives:

- **509(a)** — public-charity vs private-foundation classification for **501(c)(3)** (foundation codes), not a subsection label.
- **501(c)(9)** — VEBA; EO BMF subsection `09`.

Optional related filter (not default): subsection `23` = 501(c)(23) veterans associations formed prior to 1880.

---

## Deliverables

| Piece | Path |
|-------|------|
| Migration | `web/supabase/irs_nonprofit_import_2026_07.sql` |
| QA seed | `web/supabase/qa_irs_nonprofit_import_seed_2026_07.sql` |
| Import service | `web/src/lib/irs/*` |
| CLI | `web/scripts/irs-nonprofit-import.mjs` |
| Unit tests | `web/scripts/test-irs-nonprofit-import.mjs` |
| Admin APIs | `web/src/app/api/admin/irs-import/**` |
| Admin UI | `web/src/features/admin/AdminIrsImportPanel.jsx` on `/admin/nonprofits` |
| Public filter | `directory_status` approved/null only in directory search |

---

## Safety rules

- New imports default to **`pending_review`**.
- **`is_featured` / `is_trusted` always false** on import; approval does not auto-feature or add to Trusted Resources.
- EIN match updates IRS metadata only; curated website / phone / description / logo are preserved when already set.
- Import **never deletes** organizations.
- Production **apply** requires a successful **dry-run** batch id.

---

## Commands

```bash
# Unit tests (no DB)
pnpm --dir web run test:irs-import

# Report-only (no DB) — validates IRS download/filter
pnpm --dir web run irs:import:report -- --state=dc

# Apply schema (needs SUPABASE_ACCESS_TOKEN or DATABASE_URL / DB password)
pnpm --dir web run apply:irs-import-schema
pnpm --dir web run apply:irs-import-schema:apply

# Or paste into Supabase SQL editor:
#   web/supabase/irs_nonprofit_import_2026_07.sql

# Dry-run (QA) — DC sample (~33 subsection-19 orgs) — requires schema
pnpm --dir web run irs:import:dry -- --state=dc

# Apply after dry-run succeeds
pnpm --dir web run irs:import:apply -- --state=dc --from-dry-run=<batch-uuid>

# Larger QA sample
pnpm --dir web run irs:import:dry -- --state=va,md,dc
```

Admin UI: **Admin → Nonprofit Directory** — dry-run / apply, review queue, import logs.

### Schema apply blocker

Service-role keys alone cannot run DDL. To apply the migration you need one of:

1. Paste `web/supabase/irs_nonprofit_import_2026_07.sql` in the [Supabase SQL editor](https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new), or
2. Set `SUPABASE_ACCESS_TOKEN` (Account → Access Tokens) and run `pnpm --dir web run apply:irs-import-schema:apply`, or
3. Set `DATABASE_URL` / `SUPABASE_DB_PASSWORD` and run the same apply script.

The migration is additive (no full-table backfill on the ~1.9M directory rows). Legacy rows keep `directory_status = NULL` (treated as public).

If dry-run fails with `permission denied for table irs_nonprofit_import_batches`, paste  
`web/supabase/irs_nonprofit_import_grant_service_role_2026_07.sql` and re-run.

---

## QA validation checklist

1. [ ] Apply `web/supabase/irs_nonprofit_import_2026_07.sql` on the target Supabase project (SQL editor or `apply:irs-import-schema:apply`).
2. [ ] Confirm probe: `irs_eo_organizations` exists and `nonprofits_search_app_v1.directory_status` exists.
3. [ ] (Optional) Apply `qa_irs_nonprofit_import_seed_2026_07.sql`.
4. [ ] Run `pnpm --dir web run test:irs-import`.
5. [ ] Run `pnpm --dir web run irs:import:report -- --state=dc` — expect ~33 subsection-19 matches (validated 2026-07-30 against EO BMF dated 2026-07-13).
6. [ ] Dry-run `--state=dc` — confirm batch log row; zero org writes except batch metadata.
7. [ ] Apply with `--from-dry-run=<id>` — confirm adds; no deletes.
8. [ ] Re-run apply — EIN updates / skips look sane.
9. [ ] Admin review: pending rows visible; **Approve** one org.
10. [ ] Public directory search shows approved org; pending org **not** listed.
11. [ ] Confirm approved org is **not** featured and **not** in Trusted Resources unless manually added.
12. [ ] Import log shows batch id, source file/date, classification, counts, actor.
13. [ ] Force a bad state key — errors recorded; existing orgs untouched.
14. [ ] Spot-check multi-state (`--state="va,md,dc"`) before nation-wide apply. VA alone has ~698 subsection-19 orgs.

---

## Production deployment checklist

1. [ ] QA checklist fully green.
2. [ ] Backup / snapshot note for Supabase production (or confirm PITR).
3. [ ] Apply `irs_nonprofit_import_2026_07.sql` on **production** (do **not** run QA seed).
4. [ ] Deploy app build that includes admin IRS panel + directory status filters.
5. [ ] Dry-run production `--state=dc` first; review batch report.
6. [ ] Apply DC only; admin-approve a small sample; verify public directory.
7. [ ] Expand state-by-state or regional batches; monitor `irs_nonprofit_import_batches`.
8. [ ] Nation-wide (`--state=all`) only after regional success and acceptable runtime.
9. [ ] Confirm no Trusted Resources / featured flags flipped by import.
10. [ ] Confirm existing curated enrichment (website, logos, descriptions) unchanged for overlapping EINs.

---

## Rollback / safe failure

- Failed apply marks the batch `failed` and writes `irs_nonprofit_import_errors`; it does not delete rows.
- To hide bad imports: set `directory_status = 'hidden'` or `'rejected'` in admin (or SQL).
- To remove QA seed EINs: `delete from irs_eo_organizations where ein in ('000000019','000000023');` (and matching directory rows if mirrored).
