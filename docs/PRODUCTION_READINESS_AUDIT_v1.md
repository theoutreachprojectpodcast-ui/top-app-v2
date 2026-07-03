# tOP Production Readiness Audit v1.1

**Scope:** Static codebase review, API surface inventory, and targeted path reads (January 2026; v1.1 adds demo UI gating, May 2026).  
**Not performed in this pass:** Full manual QA of every breakpoint, App Store submission, live Stripe/WorkOS E2E, load testing, or security penetration testing. Treat **“Needs validation”** as requiring human/QA execution before launch sign-off.

---

## 1. Production readiness audit (prioritized)

### Critical (launch or trust blockers until resolved)

| ID | Area | Finding | Evidence / notes |
|----|------|---------|-------------------|
| C1 | Auth | **Dual auth model:** WorkOS (production) vs **local demo email/password** (`TopApp`, `demoAccountStore`, `createAccount`). Demo paths must be **disabled or hidden** on public production so users never assume local credentials are real. | `web/src/components/app/TopApp.js`, `web/src/lib/auth/demoAccountStore.js` |
| C2 | Auth | **`resolveWorkOSRouteUser` returns 503** when WorkOS env is missing. APIs that require auth will fail loudly until env is complete—expected, but **must** be documented in runbooks and **APP_BASE_URL** / redirect URIs must match prod. | `web/src/lib/auth/workosRouteAuth.js`, `web/scripts/validate-production-env.mjs` |
| C3 | Data | **Supabase unavailable:** Many routes return **503** (`community/posts`, `me/favorites`, `sponsor-applications`, etc.). Production requires **reliable DB + migrations** including optional tables (e.g. `top_platform_notifications`). | `web/src/app/api/**/route.js` grep `503` |
| C4 | Billing | **Stripe / podcast billing:** Sponsor application route references **`podcast_billing_not_configured`** (503). Production sponsor + podcast sponsor flows need **verified Stripe products, webhooks, and env**. | `web/src/app/api/sponsor-applications/route.js` |
| C5 | Legal / product | **Mitigated (R2):** “Reset Demo”, its explanatory copy, and **“Become a Member (demo)”** are hidden on **production** client bundles (`NODE_ENV === 'production'`), unless **`NEXT_PUBLIC_TOP_SHOW_DEMO_UI=1`** (internal QA). **Still review:** any other “demo” copy in modals when WorkOS is disabled (see C1). | `web/src/lib/runtime/demoUiVisibility.js`, `web/src/components/app/TopApp.js` |

### High (major UX, reliability, or compliance risk)

| ID | Area | Finding | Notes |
|----|------|---------|--------|
| H1 | Admin | **Placeholder admin surfaces:** Media library, forms inbox, settings pages describe v0.6 placeholders—**not production CRUD**. | `web/src/app/admin/media-library/page.js`, `admin/forms/page.js`, `admin/settings/page.js` |
| H2 | UX | **Podcast CTA:** “Members Only Content — **Coming Soon**” is `aria-disabled`—intentional stub; **replace with real gate** (auth + entitlement) or remove for launch. | `web/src/features/podcasts/components/PodcastCTASection.jsx` |
| H3 | UX | **Guest profile:** “Biography **coming soon**” fallback copy—acceptable only if product accepts; otherwise load from CMS/API. | `web/src/features/podcasts/components/PodcastGuestProfilePage.jsx` |
| H4 | Sponsors | **Sponsor application** references **demo payment acknowledgment** in UI copy when billing not live—must align with legal/comms for production. | `web/src/features/sponsors/components/SponsorApplicationForm.jsx` |
| H5 | Trusted resources | **Trusted resource application** includes `data-integration="payment-placeholder"` section—confirm real fee flow or remove. | `web/src/features/trusted-resources/application/TrustedResourceApplicationForm.jsx` |
| H6 | Community | **Demo community seeds** can be hidden via `shouldHideDemoCommunitySeeds()`—validate QA vs prod behavior so feeds are never empty or misleading. | `web/src/app/api/community/posts/route.js`, `web/src/lib/runtime/qaEnv` |
| H7 | Notifications | **Previously:** GET could **500** on DB/query errors (e.g. missing table), breaking header bell polling. **Mitigated:** GET now **degrades to empty payload** with server warning. **Still validate** table exists in prod. | `web/src/app/api/me/notifications/route.js` (Resolution log R1) |
| H8 | Mobile | **Capacitor:** Config lives at **`web/capacitor.config.js`**—confirm **origin**, **deep links**, and **sync** before store submission. | `web/capacitor.config.js` |

### Medium (polish, consistency, tech debt)

| ID | Area | Finding |
|----|------|--------|
| M1 | Podcast | **Fallback guests/episodes** when API fails—good for resilience; document which fields are **non-authoritative** in prod. |
| M2 | Logging | **console.warn** in directory/sponsor enrichment—acceptable server-side; ensure **no PII** and centralize logging for prod. |
| M3 | Contact | **Contact form** uses `mailto:` from `TopApp`—works but **no server-side ticket**; confirm product expectation. |
| M4 | Index | Root **`index.html`** legacy marketing page may **diverge** from Next app—avoid confusing stakeholders (separate from `web/`). |

### Low (nice-to-have)

| ID | Area | Finding |
|----|------|--------|
| L1 | Copy | Various **placeholder** strings in forms (normal HTML placeholders). |
| L2 | CSS | Comments referencing “placeholder” imagery in listing cards—cosmetic. |

---

## 2. Workflow completion matrix

Legend: **PR** = Production-ready · **NV** = Needs validation · **Inc** = Incomplete · **Brk** = Broken (known) · **—** = N/A  

| Workflow | Status | Notes |
|----------|--------|--------|
| Public home + directory | **NV** | Supabase search; validate rate limits and empty states. |
| WorkOS sign-in / sign-up | **NV** | Depends on env + org scope; validate callback URLs on all hosts. |
| Demo email auth | **Inc / PR*** | *Profile “Reset Demo” + demo membership CTA gated off prod builds (R2).* Full modal still reachable if WorkOS is off—misconfiguration only (C1). |
| Profile view/edit | **NV** | `/api/me`, avatar upload; validate WorkOS vs demo persistence. |
| Onboarding | **NV** | `/onboarding`, completion flags; E2E after DB migrations. |
| Membership / Stripe checkout | **NV** | Webhook + portal; test in Stripe test mode then prod. |
| Sponsors catalog + profile pages | **NV** | `/api/sponsors/catalog`, dynamic routes. |
| Sponsor application | **Inc / NV** | Billing branch + admin review; see H4, C4. |
| Podcast landing + episodes | **NV** | YouTube sync, fallbacks; see H2, M1. |
| Podcast guest apply | **NV** | `/api/podcasts/apply-guest`. |
| Trusted resources browse | **NV** | Catalog API. |
| Trusted resource apply | **Inc / NV** | Fee/placeholder section H5. |
| Community posts / likes | **NV** | 503 if storage down; moderation rules. |
| Notifications | **PR*** | *After R1 + DB table present.* |
| Admin console (users, sponsors, trusted, podcasts) | **NV** | Partial; placeholder pages H1. |
| Admin media / forms / settings | **Inc** | Placeholder only. |

---

## 3. UX / CX friction report

- **Trust:** Demo reset + demo membership copy **eroded trust** if visible to real users (C5)—**reduced** on prod builds via R2; C1 remains if WorkOS is off in prod.
- **Discoverability:** Podcast “coming soon” CTA **dead-ends** expectation (H2).
- **Consistency:** Admin placeholders feel **unfinished** compared to polished public shell (H1).
- **Recovery:** Forgot password flows are **WorkOS-hosted**—ensure help text and links match configured IdP (already partially documented in sign-in modal).
- **Loading:** Multiple surfaces depend on **Supabase**—consistent empty/error states needed when 503 (partially present).

---

## 4. Mobile readiness report

- **Next.js app:** Responsive CSS in `top-app.css`, `globals.css`, route shells—**NV** on real devices (iPhone safe areas, bottom dock, modals).
- **Capacitor:** Verify **`web/capacitor.config.js`**, **origin**, **deep links**, and **status bar** plugins before store review (H8).
- **Touch:** Form controls use `min-height: 44px` in places—spot-check modals and admin tables.

---

## 5. Authentication integrity report

- **Strengths:** `validate-production-env.mjs` enforces critical keys on CI/Vercel prod; org scoping in `workosRouteAuth.js`.
- **Risks:** Demo auth **parallel** to WorkOS (C1); session cookie prefs (`lastUsedEmail`) are client-only—fine if documented.
- **Action:** Run **`pnpm run validate:env:prod`** (or CI) on release candidates; test **org_not_allowed** and **session expiry** manually.

---

## 6. Admin readiness report

- **Implemented:** Users, sponsors, trusted resources, podcasts, billing hooks, directory tools (per `web/src/app/api/admin/*`).
- **Incomplete:** Media library, forms hub, settings **placeholders** (H1)—**block “admin complete” claims** until built or hidden from nav.
- **RBAC:** Platform admin checks (`platformAdminServer`, admin layout)—**NV** with least-privilege matrix.

---

## 7. Final launch blocker list (minimum before public launch)

1. **Disable or env-gate** local demo auth when WorkOS is intended for production (C1); demo reset + demo membership UI **gated** on prod builds (C5 / R2).  
2. **Complete or remove** admin placeholder routes from navigation (H1).  
3. **Stripe + WorkOS + Supabase** production env verification and **runbook** (C2–C4).  
4. **Apply all Supabase migrations** required for notifications, community, sponsors (C3, H7).  
5. **Replace or implement** podcast “Coming soon” CTA (H2).  
6. **Mobile:** Capacitor build + smoke on physical devices (H8).  
7. **Legal/compliance** review of sponsor/trusted **payment** copy (H4, H5).  

---

## 8. Resolution log

| Date | ID | Change |
|------|-----|--------|
| 2026-01 | **R1** | **`GET /api/me/notifications`:** On Supabase query failure for summary or list (or unread count), return **200** with empty data and **`console.warn`** instead of **500**, so the header notification bell does not spam errors when the table is missing or misconfigured. File: `web/src/app/api/me/notifications/route.js`. |
| 2026-05 | **R2** | **Local demo chrome on production builds:** Introduced `showLocalDemoChrome()` (`web/src/lib/runtime/demoUiVisibility.js`). Production bundles hide **Reset Demo**, its note, and **Become a Member (demo)** in `TopApp.js`. Set **`NEXT_PUBLIC_TOP_SHOW_DEMO_UI=1`** only on internal QA builds that need those controls against a production build. |
| 2026-05 | **R3** | **`/admin-login` production build:** Wrapped `useSearchParams` usage in **`Suspense`** so `next build` no longer fails prerender with “missing suspense with csr bailout”. File: `web/src/app/admin-login/page.js`. |

---

## Recommended next steps (execution order)

1. Run **`pnpm build`** in `web/` on a machine with production-like env.  
2. Run **`pnpm run verify:workos-auth`** and **`pnpm run smoke:routes`** if present in `package.json`.  
3. QA matrix: sign-in, profile save, sponsor browse, **one** checkout path, **one** community action, **one** admin action.  
4. Ticket each **Critical** and **High** row in your tracker; assign owners.  
5. Re-run this audit after major merges (increment version to v1.2+).

---

*End of Production Readiness Audit v1.1*
