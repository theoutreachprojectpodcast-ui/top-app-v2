# Launch handoff — manual steps

**Use [mvp-production-launch.md](./mvp-production-launch.md) as the single launch checklist.** It includes everything below plus mobile store submission, QA admin, and go-live steps.

This file is a short pointer only. **Checkbox status:** see **“Progress at a glance”** in [mvp-production-launch.md](./mvp-production-launch.md) (updated 2026-06-04).

---

## Already done in repo

See **“Already done in repo”** at the top of [mvp-production-launch.md](./mvp-production-launch.md).

---

## Your manual steps (in order)

| # | Task | Section | Status (2026-06-04) |
|---|------|---------|------------------------|
| 1 | Merge QA → main, confirm CI + Vercel deploy | §1 | Done |
| 2 | Supabase Production migrations + RLS + seed | §2 | Mostly done — #3/#6.5, grant |
| 3 | Domains & DNS (apex, www, admin) | §3 | Done |
| 4 | Vercel Production env vars | §4 | Partial — audit checklist in §4 |
| 5 | WorkOS Production keys + callback | §5 | In progress |
| 6 | Stripe live webhook + price IDs | §6 | Partial |
| 7 | Production browser smoke test | §7 | In progress |
| 8 | QA admin (optional) | §8 | Not started |
| 9 | Mobile store submission | [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) | Android Studio + SDK ready; emulator/AAB + Play listing pending |
| 10 | Go live | §10 | Not started |

Supporting files: [vercel-production-env.template](./vercel-production-env.template), [production-supabase-migration-order.md](./production-supabase-migration-order.md), [store-listing-copy.md](./store-listing-copy.md).
