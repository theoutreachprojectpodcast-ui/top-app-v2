# WorkOS dashboard & env (production)

## Required environment variables (app)

| Variable | Purpose |
|----------|---------|
| `WORKOS_API_KEY` | Server API key |
| `WORKOS_CLIENT_ID` | AuthKit client |
| `WORKOS_COOKIE_PASSWORD` | ≥32 chars; encrypts session cookie |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | **Must match** a Redirect URI in WorkOS (e.g. `https://theoutreachproject.app/callback`) |
| `WORKOS_ORGANIZATION_ID` | Recommended: pin sessions to The Outreach Project org |
| `WORKOS_COOKIE_DOMAIN` | e.g. `theoutreachproject.app` for cross-subdomain session |
| `NEXT_PUBLIC_APP_URL` / `APP_BASE_URL` | Canonical origin |
| `NEXT_PUBLIC_ADMIN_URL` | e.g. `https://admin.theoutreachproject.app` |

**Note:** The codebase uses **`NEXT_PUBLIC_WORKOS_REDIRECT_URI`**, not `WORKOS_REDIRECT_URI`. Some teams document the same URL under both names in Vercel for clarity — only the `NEXT_PUBLIC_*` value is read by AuthKit configuration in this repo.

## WorkOS dashboard

1. **Redirect URIs:** Add every origin you use (localhost ports, QA Vercel URL, production apex callback). Must match `NEXT_PUBLIC_WORKOS_REDIRECT_URI` **exactly** for that deployment.
2. **Environment:** Staging keys only in Staging; Production keys in Production — mismatch causes redirect URI errors.
3. Rebuild after changing **`NEXT_PUBLIC_*`** vars.

## Deeper references

- [workos-auth-setup.md](./workos-auth-setup.md) (historical runbook)
- `web/docs/WORKOS_HOSTED_SIGNIN.md`
- `web/docs/WORKOS_CLI.md`
