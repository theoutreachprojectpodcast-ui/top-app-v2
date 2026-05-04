# Production domains (The Outreach Project)

Single Vercel deployment; apex, `www`, and `admin` all point at the same app.

## DNS (summary)

| Record | Name | Value |
|--------|------|--------|
| A | `@` | Vercel apex target (e.g. `76.76.21.21` or value from Vercel dashboard) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |

In **Vercel → Project → Domains**, add `theoutreachproject.app`, `www.theoutreachproject.app`, and `admin.theoutreachproject.app`. Set the **primary** domain to `theoutreachproject.app`.

## WWW → apex

- **Vercel**: Primary domain + optional dashboard “redirect www” (recommended).
- **Repo**: Root `vercel.json` includes a **301** redirect from `www.theoutreachproject.app` to `https://theoutreachproject.app` (edge, before the serverless function).
- **App**: `web/src/proxy.js` also redirects `www` → apex when `NEXT_PUBLIC_APP_URL` (or `APP_BASE_URL`) hostname matches, including non-Vercel hosts.

## Admin subdomain → `/admin`

`web/src/proxy.js` rewrites `https://admin.theoutreachproject.app/` (and paths that are not `/api`, `/_next`, `/callback`, `/sign-out`, or already `/admin…`) to the internal `/admin…` routes. No second deployment.

Configure **`NEXT_PUBLIC_ADMIN_URL=https://admin.theoutreachproject.app`** so the proxy recognizes the admin host.

## Cross-subdomain sessions (WorkOS + idle cookies)

Set:

```bash
WORKOS_COOKIE_DOMAIN=theoutreachproject.app
```

(no leading dot). This is the [AuthKit cookie domain](https://workos.com/docs/authkit/nextjs/cookie-settings); it must match the value used for **`WORKOS_COOKIE_PASSWORD`** across the project.

App-managed idle cookies (`TOP_LAST_ACTIVE_COOKIE`, `TOP_SESSION_FP_COOKIE`) use the same domain when `WORKOS_COOKIE_DOMAIN` (or `TOP_SHARED_COOKIE_DOMAIN`) is set — see `web/src/proxy.js` and `web/src/app/api/auth/activity/route.js`.

## WorkOS callback

Register **`https://theoutreachproject.app/callback`** as the redirect URI. Sign-in from the admin host sends users through the apex `/api/auth/workos/signin` flow with a safe `returnTo` that can resolve back to the admin URL (see `web/src/lib/auth/workosSafeReturn.js`).

## Environment variables

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://theoutreachproject.app` |
| `APP_BASE_URL` | `https://theoutreachproject.app` |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.theoutreachproject.app` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `https://theoutreachproject.app/callback` |
| `WORKOS_COOKIE_DOMAIN` | `theoutreachproject.app` |

## Admin access control

`/admin` is gated in **`web/src/app/admin/layout.js`** (server): WorkOS session, org scope, and `isPlatformAdminServer`. On the admin hostname, users who are not platform admins are redirected to the **apex** home (`APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`), not to a relative `/` (which would loop on the admin host).

## Validation checklist

- Apex and `admin` load; `www` 301s to apex.
- Sign in on apex → open admin host → still authenticated (with `WORKOS_COOKIE_DOMAIN` set).
- Sign out on any host → session cleared everywhere on the registrable domain.
- Non-admin cannot use admin host (redirect to apex `/`).

## Troubleshooting: “This is not a valid redirect URI” (WorkOS)

The error page lists the **exact** `redirect_uri` your deployment sent (for example `https://the-outreach-project-app.vercel.app/callback`) and the **WorkOS environment** (for example **VolenteLabs (Staging)**).

1. **Open WorkOS → that same environment (Staging vs Production)** — it must match where your **`WORKOS_CLIENT_ID` / `WORKOS_API_KEY`** in Vercel come from.
2. Under **Redirects**, add **that exact URL** (scheme, host, path `/callback`, no typo). Whitespace and `http` vs `https` must match.
3. In **Vercel → Settings → Environment Variables** for the deployment you are testing (**Production** vs **Preview**), set **`NEXT_PUBLIC_WORKOS_REDIRECT_URI`** to the **same** string you registered. `NEXT_PUBLIC_*` is baked in at **build** time — **redeploy** after any change.
4. **Staging keys on Production** — if Vercel Production uses **Staging** WorkOS keys, every redirect URI you use in production (apex **or** `*.vercel.app`) must be allowed in **WorkOS Staging**. To use only apex in prod, either add `https://theoutreachproject.app/callback` there **and** set the env var to that, **or** move Production to **WorkOS Production** keys and register the apex callback in the Production dashboard.

Until the URI in the error message appears in the matching WorkOS environment, sign-in will always fail — a git deploy alone does not fix it.
