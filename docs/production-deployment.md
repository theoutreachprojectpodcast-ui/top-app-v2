# Production deployment checklist

## Domains

- Apex: `https://theoutreachproject.app`
- **www** → apex (301): Vercel primary domain + root `vercel.json` + `proxy.js`
- **admin** → same deployment; `NEXT_PUBLIC_ADMIN_URL` + `proxy.js` rewrite to `/admin`

## Environment (Vercel Production)

- [ ] `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` — apex HTTPS
- [ ] `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — `https://theoutreachproject.app/callback` (registered in WorkOS **Production**)
- [ ] `WORKOS_*` keys from **Production** WorkOS
- [ ] `WORKOS_COOKIE_DOMAIN` — `theoutreachproject.app`
- [ ] `WORKOS_COOKIE_PASSWORD` — 32+ chars, stable across deploys
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`
- [ ] Stripe **live** keys + **live** webhook secret + live price IDs
- [ ] `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0` or unset

## Database

- [ ] Run additive migrations through Supabase (including `web/supabase/torp_profiles_last_login_v06.sql` if not yet applied)

## Post-deploy smoke

- [ ] Sign up / sign in / sign out
- [ ] `/api/me` returns profile + entitlements
- [ ] Test checkout (small amount) + webhook receipt in Stripe + profile tier/status update
- [ ] Admin reachable only for admins

## References

- [deployment-domains.md](./deployment-domains.md)
- [PRODUCTION_AUDIT_V06_AUTH_BILLING.md](./PRODUCTION_AUDIT_V06_AUTH_BILLING.md)
