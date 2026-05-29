# Launch handoff — your manual steps

Everything the agent **completed in-repo** is listed under [Automated](#automated). Work through the sections below in order.

---

## Automated

| Item | Status |
|------|--------|
| Local CI parity: `pnpm install`, lint, build, `smoke:routes`, `security:guards` | Run during handoff commit (see git log) |
| Admin QA/production code (`admin-qa`, `deploymentHosts`, auth return targets) | In repo |
| `/privacy` and `/terms` pages + footer links | In repo |
| `mobile:prep:prod` script (`CAP_SERVER_URL=https://theoutreachproject.app`) | In repo |
| Capacitor Android sync with Production URL (Windows; iOS sync needs macOS) | Run if `cap sync` succeeded |
| [production-supabase-migration-order.md](./production-supabase-migration-order.md) | Created |
| [store-listing-copy.md](./store-listing-copy.md) | Created |
| [vercel-production-env.template](./vercel-production-env.template) | Created |
| [admin-qa-production-setup.md](./admin-qa-production-setup.md) | Created |

---

## 1. Vercel — Production env vars

Copy [vercel-production-env.template](./vercel-production-env.template) into **Vercel → Project → Settings → Environment Variables → Production**. Fill secrets from WorkOS Production, Supabase Production, and Stripe Live dashboards.

Redeploy Production after saving (required for `NEXT_PUBLIC_*`).

---

## 2. Vercel — Domains & DNS

- [ ] Add `theoutreachproject.app` (primary), `www.theoutreachproject.app`, `admin.theoutreachproject.app`
- [ ] DNS: apex **A** record + **CNAME** for `www` and `admin` → Vercel
- [ ] QA (optional now): `qa.theoutreachproject.app`, `admin-qa.theoutreachproject.app` on Preview

See [deployment-domains.md](./deployment-domains.md).

---

## 3. WorkOS Production

- [ ] Switch to **Production** environment in WorkOS dashboard
- [ ] Copy `sk_live_…` and `client_…` into Vercel Production
- [ ] Register redirect URI: `https://theoutreachproject.app/callback`
- [ ] Add launch team emails to WorkOS Organization

---

## 4. Supabase Production

- [ ] Apply migrations in order: [production-supabase-migration-order.md](./production-supabase-migration-order.md)
- [ ] Verify RLS on user tables
- [ ] Seed sponsors if catalog empty (`pnpm --dir web run seed:sponsors` with prod keys, or SQL)
- [ ] Grant platform admin for ops emails (`admin_backend_v06_access_control.sql` pattern)

---

## 5. Stripe Live

- [ ] Live mode webhook: `https://theoutreachproject.app/api/billing/webhook`
- [ ] Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.upcoming`
- [ ] Live price IDs in Vercel Production
- [ ] Copy webhook secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Redeploy

---

## 6. Merge & deploy web

- [ ] Merge **QA → `main`** (or your production branch)
- [ ] Confirm GitHub Actions green on the merge commit
- [ ] Confirm Vercel Production deploy succeeded

---

## 7. Production smoke (browser)

Use [mvp-production-launch.md §6](./mvp-production-launch.md#6-deploy--smoke-test-production).

Optional CLI against live URL:

```bash
pnpm --dir web run verify:workos-auth
pnpm --dir web run smoke:qa:http
```

---

## 8. QA admin (if testing admin on QA first)

See [admin-qa-production-setup.md](./admin-qa-production-setup.md):

- [ ] Preview env: `NEXT_PUBLIC_ADMIN_URL=https://admin-qa.theoutreachproject.app`
- [ ] `QA_PLATFORM_ADMIN_EMAILS=…`
- [ ] WorkOS Staging callback for QA URL

---

## 9. Mobile — store submission (you)

On **macOS** for iOS; Android Studio on any OS.

```bash
pnpm --dir web run mobile:prep:prod
pnpm --dir web run cap:open:android   # or cap:open:ios on Mac
```

- [ ] Replace placeholder icons/splash if needed (`capacitor-assets` or manual)
- [ ] Use copy from [store-listing-copy.md](./store-listing-copy.md)
- [ ] Apple: App Store Connect → archive → TestFlight → submit
- [ ] Google: Play Console → signed AAB → internal test → production

Full checklist: [mvp-production-launch.md §7](./mvp-production-launch.md#7-mobile-app-capacitor--app-store--play-store).

---

## 10. Go live

- [ ] Review `/privacy` and `/terms` copy with counsel if needed
- [ ] Hide placeholder admin pages you do not want public
- [ ] Announce after section 7 smoke passes
- [ ] Monitor Vercel logs + Stripe webhooks for 1 hour

---

## Quick reference URLs (Production)

| URL | Purpose |
|-----|---------|
| https://theoutreachproject.app | Public app |
| https://admin.theoutreachproject.app | Admin console |
| https://theoutreachproject.app/privacy | Privacy policy |
| https://theoutreachproject.app/terms | Terms of use |
| https://theoutreachproject.app/contact | Support / contact |
