# Admin access — QA and Production

Separate **admin hostname** (`admin-qa…` / `admin…`) on the same Vercel deployment. Public app stays on apex/QA URL; admin UI rewrites to `/admin` routes.

---

## How it works

| URL | Behavior |
|-----|----------|
| `https://qa.theoutreachproject.app` | Public QA app |
| `https://admin-qa.theoutreachproject.app` | Admin console (proxy rewrites to `/admin…`) |
| `https://theoutreachproject.app` | Public production |
| `https://admin.theoutreachproject.app` | Admin production |

Code: `web/src/proxy.js` + `web/src/lib/runtime/deploymentHosts.js`.

**Who can access admin**

- Emails in `adminPolicy.js` bootstrap list
- `PLATFORM_ADMIN_EMAILS` (all environments)
- `QA_PLATFORM_ADMIN_EMAILS` (QA / Preview only — see `qaDeploymentContext.js`)
- DB grant: `platform_role = admin` + `admin_access_enabled = true` + `admin_access_granted_by` set

---

## 1. QA setup (Vercel Preview / QA branch)

### Domains (recommended)

In **Vercel → Project → Domains**, assign to **Preview** (QA branch):

| Domain | Purpose |
|--------|---------|
| `qa.theoutreachproject.app` | Public QA |
| `admin-qa.theoutreachproject.app` | Admin QA |

DNS: CNAME both to `cname.vercel-dns.com`.

Fallback without custom domains: use `https://qa-the-outreach-project.vercel.app/admin` (no separate admin host).

### Environment variables (Preview / QA)

Set for **Preview** environment (or branch-specific):

```bash
APP_BASE_URL=https://qa.theoutreachproject.app
NEXT_PUBLIC_APP_URL=https://qa.theoutreachproject.app
NEXT_PUBLIC_ADMIN_URL=https://admin-qa.theoutreachproject.app
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://qa.theoutreachproject.app/callback
WORKOS_COOKIE_DOMAIN=theoutreachproject.app
```

Also set WorkOS (Staging), Supabase QA, and Stripe test keys as today.

**Admin testers (server-only):**

```bash
QA_PLATFORM_ADMIN_EMAILS=you@example.com,teammate@example.com
```

Redeploy after changing `NEXT_PUBLIC_*`.

### WorkOS (Staging)

1. Add redirect URI: `https://qa.theoutreachproject.app/callback` (and `.vercel.app` URL if you use it).
2. Add QA admin emails to your WorkOS Organization.

### Supabase QA

1. Run `web/supabase/admin_backend_v06_access_control.sql` if not applied.
2. After tester signs in once, run `web/supabase/qa_bootstrap_platform_admin.sql` (uncomment + set email), **or** rely on `QA_PLATFORM_ADMIN_EMAILS`.

### QA smoke

1. Open `https://admin-qa.theoutreachproject.app` → admin login.
2. Sign in with approved email → lands on admin overview.
3. From public QA, **Admin Console** link opens admin host.
4. **Exit admin** returns to public QA (not a redirect loop).
5. Non-admin user on admin host → redirected to public QA home.

---

## 2. Production setup

### Domains

| Domain | Purpose |
|--------|---------|
| `theoutreachproject.app` | Public (primary) |
| `admin.theoutreachproject.app` | Admin |

See [deployment-domains.md](./deployment-domains.md).

### Environment variables (Production)

```bash
APP_BASE_URL=https://theoutreachproject.app
NEXT_PUBLIC_APP_URL=https://theoutreachproject.app
NEXT_PUBLIC_ADMIN_URL=https://admin.theoutreachproject.app
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://theoutreachproject.app/callback
WORKOS_COOKIE_DOMAIN=theoutreachproject.app
PLATFORM_ADMIN_EMAILS=ops@yourdomain.com
NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0
```

Use **WorkOS Production** keys and register production callback URI.

Do **not** set `QA_PLATFORM_ADMIN_EMAILS` on Production.

### Production smoke

Same as QA: admin host login, cross-subdomain session (with `WORKOS_COOKIE_DOMAIN`), non-admin blocked.

---

## 3. Local dev

```bash
# .env.local
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_ADMIN_URL=http://localhost:3000   # optional; /admin on same host
PLATFORM_ADMIN_EMAILS=you@example.com
```

Admin: `http://localhost:3000/admin` or `http://localhost:3000/admin-login`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Admin host shows public home | Set `NEXT_PUBLIC_ADMIN_URL` and redeploy |
| Sign-in loop | Register exact callback URI in WorkOS; match `NEXT_PUBLIC_WORKOS_REDIRECT_URI` |
| Session not shared apex ↔ admin | Set `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` (registrable domain, no leading dot) |
| “Not approved” on magic link | Add email to `QA_PLATFORM_ADMIN_EMAILS` or DB admin grant |
| Exit admin loops on admin host | Fixed via `appPublicHref()` — pull latest |

---

## Related

- [deployment-domains.md](./deployment-domains.md)
- [production-deployment.md](./production-deployment.md)
- [mvp-production-launch.md](./mvp-production-launch.md)
