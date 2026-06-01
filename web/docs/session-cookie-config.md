# Session Cookie Configuration (v0.6)

## Production settings

For cross-subdomain continuity (`apex`, `www`, `admin`):

- `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` (no leading dot)
- `WORKOS_COOKIE_PASSWORD` >= 32 chars
- HTTPS only in production

App-managed idle cookies use:

- `httpOnly: true`
- `secure: true` on HTTPS
- `sameSite: "lax"`
- shared domain from `WORKOS_COOKIE_DOMAIN` (or `TOP_SHARED_COOKIE_DOMAIN`)

## Idle timeout policy

- Default inactivity timeout: 24 hours (`TOP_SESSION_IDLE_MS`, default `86400000`)
- Auto sign-out only when idle threshold is exceeded
- Manual sign-out always available at `/sign-out` (or `/auth/logout` alias)

## Endpoints involved

- `proxy.js` (AuthKit proxy + idle cookie refresh)
- `POST /api/auth/activity` (pointer-activity heartbeat)
- `GET /api/auth/status` (diagnostic status incl. cookie-domain visibility)

## Common failure patterns

- Host-only WorkOS cookie (missing cookie domain) -> appears logged out on subdomain switches.
- Mismatched callback/redirect URI -> auth start works but callback session fails.
- Mixed staging/production WorkOS keys -> production auth instability.
