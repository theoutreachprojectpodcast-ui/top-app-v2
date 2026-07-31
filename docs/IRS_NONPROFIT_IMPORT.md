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

# Dry-run (QA) — DC sample (~33 subsection-19 orgs)
pnpm --dir web run irs:import:dry -- --state=dc

# Apply after dry-run succeeds
pnpm --dir web run irs:import:apply -- --state=dc --from-dry-run=<batch-uuid>

# Larger QA sample
pnpm --dir web run irs:import:dry -- --state=va,md,dc
```

Admin UI: **Admin → Nonprofit Directory** — dry-run / apply, review queue, import logs.

---

## QA validation checklist

1. [ ] Apply `web/supabase/irs_nonprofit_import_2026_07.sql` on **QA** Supabase.
2. [ ] (Optional) Apply `qa_irs_nonprofit_import_seed_2026_07.sql`.
3. [ ] Run `pnpm --dir web run test:irs-import`.
4. [ ] Dry-run `--state=dc` — confirm ~30+ subsection 19 matches; zero writes except batch log.
5. [ ] Apply with `--from-dry-run=<id>` — confirm adds/updates; no deletes.
6. [ ] Re-run apply — duplicates skipped / EIN updates only; counts look sane.
7. [ ] Admin review: pending rows visible; **Approve** one org.
8. [ ] Public directory search (approved EIN / veteran audience) shows approved org; pending org **not** listed.
9. [ ] Confirm approved org is **not** featured and **not** in Trusted Resources unless manually added.
10. [ ] Import log shows batch id, source file/date, classification, counts, actor.
11. [ ] Force a bad state key / offline case — batch `failed` or errors recorded; existing orgs untouched.
12. [ ] Spot-check performance on a multi-state dry-run (`va,md,dc` or a region) before nation-wide apply.

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
