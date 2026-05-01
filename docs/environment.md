# QA vs production environments (v0.6)

## Principles

- **Production** must not ship with demo-only UI pretending to be real data. Seeded community or directory content should be hidden when the deployment is production-like (see `shouldHideDemoCommunitySeeds` and related helpers in `web/src/lib/runtime`).
- **QA** may enable demo accounts, seeded posts, and local-only tools for regression testing.

## Configuration

- WorkOS, Supabase service role, Stripe keys, and YouTube API keys are required for full podcast and billing behavior. Missing keys are reported via **`/api/auth/status`** so the UI can degrade gracefully.

## Production domains (apex, www, admin)

See **[deployment-domains.md](./deployment-domains.md)** for Vercel/DNS, `WORKOS_COOKIE_DOMAIN`, `NEXT_PUBLIC_ADMIN_URL`, and the admin subdomain rewrite.

## References

- `web/docs/qa-demo-data.md`
- `web/docs/TORP_v0.4_RELEASE_WORKFLOW.md`
