# Production authentication (tOP v0.6)

## Architecture

- **WorkOS AuthKit** for real users: hosted UI → **`/callback`** → encrypted session cookie.
- **Next.js 16 `src/proxy.js`**: AuthKit proxy, optional **www → apex** redirect, **admin subdomain → `/admin`** rewrite, sliding **24h idle** cookies aligned with `WORKOS_COOKIE_DOMAIN`.
- **Client:** `AuthSessionProvider` + `ProfileDataProvider` at app root; **`GET /api/me`** with `credentials: "include"` is the session + profile source of truth after paint.

## Session persistence

- Set **`WORKOS_COOKIE_DOMAIN`** to the registrable domain (e.g. `theoutreachproject.app`, no leading dot) so apex, `www`, and `admin` share the WorkOS session.
- Idle extension uses **`TOP_LAST_ACTIVE_COOKIE`** / **`TOP_SESSION_FP_COOKIE`** with the same domain when configured.

## Sign out

- **`/sign-out`** uses AuthKit `signOut`; clears server session. Client nav cache cleared on explicit sign-out per app rules.

## Related docs

- [workos-setup.md](./workos-setup.md)
- [deployment-domains.md](./deployment-domains.md)
- [PRODUCTION_AUDIT_V06_AUTH_BILLING.md](./PRODUCTION_AUDIT_V06_AUTH_BILLING.md)
