# QA vs production environments (v0.6)

## Principles

- **Production** must not ship with demo-only UI pretending to be real data. Seeded community or directory content should be hidden when the deployment is production-like (see `shouldHideDemoCommunitySeeds` and related helpers in `web/src/lib/runtime`).
- **QA** may enable demo accounts, seeded posts, and local-only tools for regression testing.

## Configuration

- WorkOS, Supabase service role, Stripe keys, and YouTube API keys are required for full podcast and billing behavior. Missing keys are reported via **`/api/auth/status`** so the UI can degrade gracefully.

## References

- `web/docs/qa-demo-data.md`
- `web/docs/TORP_v0.4_RELEASE_WORKFLOW.md`
