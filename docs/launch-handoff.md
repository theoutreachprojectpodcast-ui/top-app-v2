# Launch handoff — manual steps

**Use [mvp-production-launch.md](./mvp-production-launch.md) as the single launch checklist.** It includes everything below plus mobile store submission, QA admin, and go-live steps.

This file is a short pointer only.

---

## Already done in repo

See **“Already done in repo”** at the top of [mvp-production-launch.md](./mvp-production-launch.md).

---

## Your manual steps (in order)

| # | Task | Section in mvp-production-launch.md |
|---|------|-------------------------------------|
| 1 | Merge QA → main, confirm CI + Vercel deploy | §1 |
| 2 | Supabase Production migrations + RLS + seed | §2 |
| 3 | Domains & DNS (apex, www, admin) | §3 |
| 4 | Vercel Production env vars | §4 |
| 5 | WorkOS Production keys + callback | §5 |
| 6 | Stripe live webhook + price IDs | §6 |
| 7 | Production browser smoke test | §7 |
| 8 | QA admin (optional) | §8 |
| 9 | Mobile store submission | §9 |
| 10 | Go live | §10 |

Supporting files: [vercel-production-env.template](./vercel-production-env.template), [production-supabase-migration-order.md](./production-supabase-migration-order.md), [store-listing-copy.md](./store-listing-copy.md).
