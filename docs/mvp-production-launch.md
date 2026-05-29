# MVP production launch — streamlined checklist

One path from **QA → live** at `https://theoutreachproject.app`. Skip anything not needed for first real users.

---

## 1. Ship the code

- [ ] QA branch green in GitHub Actions (lint, build, security smoke).
- [ ] Merge **QA → `main`** (or deploy QA if that is your production branch).
- [ ] Confirm Vercel **Production** deploys from the correct branch.

**Local sanity (from repo root):**

```bash
pnpm install
pnpm --dir web run validate:env:prod   # with Production env vars loaded
pnpm --dir web run build
pnpm --dir web run smoke:routes
```

---

## 2. Database (Supabase Production)

- [ ] Use the **Production** Supabase project (not QA/dev).
- [ ] Apply any migrations not yet run on Production (SQL in `web/supabase/`).
  - Minimum for MVP: profiles, community, sponsors/trusted, podcasts, billing-related profile columns, admin access, **`admin_audit_logs_v01.sql`** if admin is live.
- [ ] Seed or verify **sponsor catalog** and **featured home sponsors** exist in Production.
- [ ] Confirm **RLS** is enabled on user-facing tables (profiles, community, favorites, etc.).

---

## 3. Domains & Vercel

- [ ] In Vercel → Domains, add:
  - `theoutreachproject.app` (**primary**)
  - `www.theoutreachproject.app`
  - `admin.theoutreachproject.app`
- [ ] DNS: apex **A** + **CNAME** for `www` and `admin` (see [deployment-domains.md](./deployment-domains.md)).
- [ ] After deploy: `www` **301s** to apex; `admin` loads `/admin`.

---

## 4. Production environment variables (Vercel)

Set on **Production** only. Redeploy after changes (especially `NEXT_PUBLIC_*`).

| Area | Required |
|------|----------|
| **App URLs** | `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` = `https://theoutreachproject.app` |
| **Admin** | `NEXT_PUBLIC_ADMIN_URL` = `https://admin.theoutreachproject.app` |
| **WorkOS** | Production `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (32+ chars, stable), `WORKOS_COOKIE_DOMAIN` = `theoutreachproject.app`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` = `https://theoutreachproject.app/callback` |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Live secret key, live webhook secret, live price IDs for membership (and sponsor checkout if enabled) |
| **MVP off switch** | `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0` (or unset) |

Register **`https://theoutreachproject.app/callback`** in **WorkOS Production** → Redirects (must match env exactly).

Details: [production-deployment.md](./production-deployment.md), [deployment-domains.md](./deployment-domains.md).

---

## 5. Stripe webhook (live)

- [ ] Stripe Dashboard → **Live** mode → Webhooks → endpoint: `https://theoutreachproject.app/api/billing/webhook`
- [ ] Events: subscription + checkout events your app handles (see `web/src/app/api/billing/webhook/route.js`).
- [ ] Copy **live** webhook secret into Vercel `STRIPE_WEBHOOK_SECRET` (or equivalent env name in your project).
- [ ] Redeploy.

---

## 6. Deploy & smoke test (Production)

Run through once on **real devices** (phone + desktop):

| Check | Pass? |
|-------|-------|
| Home, directory search, trusted, sponsors, community, podcasts load | |
| Sign up / sign in / sign out (WorkOS) | |
| `/api/me` returns profile when signed in | |
| Profile + onboarding save | |
| One **live** membership checkout (small amount) → Stripe receipt → profile tier updates | |
| Admin host: only platform admins reach `/admin`; others redirect to apex | |
| Contact form / sponsor application submits | |
| No demo-only UI (“Reset demo”, etc.) visible | |

Optional CLI:

```bash
pnpm --dir web run verify:workos-auth
pnpm --dir web run smoke:qa:http   # against Production URL if configured
```

If mobile is in scope, also run section **7.3** on a physical device before store submission.

---

## 7. Mobile app (Capacitor → App Store & Play Store)

Native iOS and Android shells live under **`web/`**. They do **not** bundle the Next.js build — the WebView loads your **live Production URL** (`CAP_SERVER_URL`). Ship **web Production first** (sections 1–6), then build and submit native wrappers.

**Identity (update before first store upload if branding changes):**

| Field | Value |
|-------|--------|
| Bundle / application ID | `org.theoutreachproject.torp` |
| Display name | The Outreach Project |
| Config | `web/capacitor.config.js` |
| Native projects | `web/ios/`, `web/android/` |

Deep technical reference: [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md).

---

### 7.1 Prerequisites

- [ ] **Production web** live at `https://theoutreachproject.app` (section 6 passed).
- [ ] **Node ≥ 22** for Capacitor CLI (`pnpm exec cap …`).
- [ ] **Apple Developer Program** enrolled ([developer.apple.com](https://developer.apple.com)) — required for TestFlight and App Store.
- [ ] **Google Play Console** account ([play.google.com/console](https://play.google.com/console)) — one-time registration fee.
- [ ] **macOS + Xcode** (latest stable) for iOS builds and App Store upload.
- [ ] **Android Studio** for Android builds and Play upload (Windows/macOS/Linux).
- [ ] **Privacy policy URL** on Production (e.g. `https://theoutreachproject.app/privacy`) — required by both stores.
- [ ] **Support / contact URL** on Production — required for store listings.

---

### 7.2 Point Capacitor at Production & sync

From repo root (PowerShell example):

```powershell
cd web
$env:CAP_SERVER_URL="https://theoutreachproject.app"
pnpm run mobile:prep
```

This runs `pnpm run build` (validates Next) then `cap sync` (copies config + `capacitor-www/` into native projects).

**Before every store build**, confirm `CAP_SERVER_URL` is Production HTTPS (not QA, not localhost). Re-run `pnpm exec cap sync` after changing it.

Open native IDEs:

```bash
pnpm --dir web run cap:open:ios      # macOS only → Xcode
pnpm --dir web run cap:open:android  # Android Studio
```

---

### 7.3 WorkOS & auth for mobile WebView

The app loads the same WorkOS AuthKit flow as the browser. Register in **WorkOS Production**:

- [ ] Redirect URI: `https://theoutreachproject.app/callback` (must match `NEXT_PUBLIC_WORKOS_REDIRECT_URI`).
- [ ] Cookie domain on Vercel: `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` so sessions persist in the WebView.

**Smoke on a real device** (not only emulator):

- [ ] Sign in / sign out
- [ ] Profile load after cold start
- [ ] Stripe membership checkout (Safari/Chrome in-app browser or return to app)
- [ ] Core tabs: Home, Directory, Community, Profile

---

### 7.4 Store assets & versioning (both platforms)

- [ ] Replace placeholder **app icon** and **splash** (see [Capacitor assets guide](https://capacitorjs.com/docs/guides/splash-screens-and-icons) or `pnpm exec capacitor-assets` from `web/`).
- [ ] Prepare **screenshots** (phone required; tablet optional for iPad / Play feature graphic).
- [ ] Write **short + full description**, **keywords** (App Store), **category** (e.g. Social Networking / Lifestyle).
- [ ] Bump version before each submission:
  - **iOS:** `MARKETING_VERSION` + build number in Xcode (`web/ios/App/App.xcodeproj`)
  - **Android:** `versionName` + increment `versionCode` in `web/android/app/build.gradle`

---

### 7.5 Apple App Store process

#### A. App Store Connect setup

1. [ ] [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. [ ] Platform: **iOS**. Name: **The Outreach Project**. Primary language. Bundle ID: **`org.theoutreachproject.torp`** (must exist in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)).
3. [ ] SKU: internal id (e.g. `torp-ios-001`). User Access as needed.

#### B. Xcode signing & archive

1. [ ] Xcode → open `web/ios/App/App.xcworkspace` or project via `cap open ios`.
2. [ ] **Signing & Capabilities:** Team = your Apple Developer team; **Automatically manage signing** (or manual profiles for release).
3. [ ] Scheme: **App**, destination: **Any iOS Device (arm64)**.
4. [ ] **Product → Archive** → **Distribute App** → **App Store Connect** → Upload.

#### C. TestFlight (recommended before public release)

1. [ ] After upload, build appears in App Store Connect → **TestFlight** (processing ~5–30 min).
2. [ ] **Internal testing:** add team Apple IDs — immediate.
3. [ ] **External testing:** create group, submit for **Beta App Review** (lighter than full review).
4. [ ] Run section 7.3 smoke on TestFlight build.

#### D. App Store submission

In App Store Connect → your app → **App Store** tab:

| Item | Notes |
|------|--------|
| **Privacy Policy URL** | Production HTTPS |
| **App Privacy** | Declare data collected (account email, usage if analytics, purchases via Stripe web — clarify no in-app purchase SKU if billing is web-only) |
| **Age rating** | Complete questionnaire |
| **Screenshots** | 6.7" and 6.5" iPhone sizes minimum |
| **Review notes** | Test account email + password for Apple reviewers; explain app loads `theoutreachproject.app` in WebView |
| **Export compliance** | Typically “No” for standard HTTPS-only apps unless custom encryption |

1. [ ] Select the uploaded build under **Build**.
2. [ ] **Add for Review** → submit.

**Review time:** often 24–48 hours; rejections usually missing login, broken callback, or privacy metadata — fix and resubmit.

#### E. After Apple approval

- [ ] **Release manually** or **automatically** per your App Store Connect setting.
- [ ] Monitor crashes (Xcode Organizer / App Store Connect **Metrics**).
- [ ] For updates: bump version → archive → upload → new App Store version.

---

### 7.6 Google Play Store process

#### A. Play Console app record

1. [ ] Play Console → **Create app**.
2. [ ] Name: **The Outreach Project**. Default language. App / game: **App**. Free (membership billed on web via Stripe).
3. [ ] Accept Play policies; complete **Dashboard** setup tasks.

#### B. Signing & release build

1. [ ] **Play App Signing:** enable (Google manages app signing key; you use upload key).
2. [ ] Generate **upload keystore** (store securely — loss blocks updates):

   ```bash
   keytool -genkey -v -keystore torp-upload.keystore -alias torp -keyalg RSA -keysize 2048 -validity 10000
   ```

3. [ ] Android Studio → **Build → Generate Signed Bundle / APK** → **Android App Bundle (AAB)** recommended.
4. [ ] Or from CLI after configuring signing in `web/android/app/build.gradle` / `gradle.properties`.

#### C. Store listing & policy forms

Complete under **Grow → Store presence** and **Policy**:

| Task | Notes |
|------|--------|
| **Main store listing** | Title, short/full description, icon 512×512, feature graphic 1024×500, phone screenshots |
| **Privacy policy** | Same Production URL as iOS |
| **App access** | If login required, provide **test credentials** for reviewers |
| **Ads** | Declare if app contains ads (typically No) |
| **Content rating** | Complete IARC questionnaire |
| **Data safety** | Declare account info, payment info (if collected on web), security practices |
| **Target audience** | Age groups; comply with Families policy if applicable |

#### D. Testing tracks → Production

1. [ ] **Internal testing:** upload AAB, add tester emails — fast iteration.
2. [ ] **Closed testing** (optional): wider QA group.
3. [ ] **Open testing** (optional): public beta.
4. [ ] **Production:** promote release from testing track or upload directly after checks pass.

First **Production** submission triggers **Google review** (often hours to a few days).

#### E. After Play approval

- [ ] Confirm **Production** rollout at 100% (or staged %).
- [ ] Watch **Android vitals** (crashes, ANRs) in Play Console.
- [ ] Updates: increment `versionCode`, build new AAB, new release notes.

---

### 7.7 Mobile launch checklist (summary)

| Check | Pass? |
|-------|-------|
| `CAP_SERVER_URL=https://theoutreachproject.app` synced before release build | |
| Sign-in / sign-out on physical iOS + Android | |
| Membership checkout completes on device | |
| Icons + splash not placeholders (or acceptable for v1) | |
| Privacy policy + support URLs live | |
| TestFlight / internal track validated | |
| Store listings + reviewer test account submitted | |
| iOS + Android approved and published | |

**Note:** Most product changes ship via **Vercel web deploy** — users get updates without a store release. Store resubmission is needed for native shell changes (Capacitor upgrade, permissions, icon, `Info.plist` / manifest changes).

---

## 8. Go live

- [ ] Remove or hide **placeholder admin pages** and any “coming soon” copy you do not want public.
- [ ] Confirm **privacy / terms / contact** pages are correct for Production.
- [ ] Announce / flip DNS only after section 6 passes.
- [ ] Watch Vercel logs + Stripe webhook deliveries for the first hour.

---

## MVP launch blockers (do not skip)

**Web**

1. **WorkOS Production** keys + callback URI aligned with Vercel env.
2. **Supabase Production** migrations applied.
3. **Stripe live** checkout + webhook updating membership status.
4. **Demo mode off** in Production.
5. **Admin** gated to platform admins only.

**Mobile (if shipping native apps with MVP)**

6. **Production web** stable before pointing `CAP_SERVER_URL` at apex.
7. **WorkOS callback + cookies** verified inside iOS/Android WebView.
8. **Store policy forms** complete (privacy URL, data safety / App Privacy, reviewer test account).
9. **Signed release builds** uploaded; not debug builds pointed at QA.

---

## Reference docs (deeper detail)

- [admin-qa-production-setup.md](./admin-qa-production-setup.md) — QA admin host + production mirror
- [../web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md) — Capacitor architecture, scripts, dev URLs
- [production-deployment.md](./production-deployment.md)
- [deployment-domains.md](./deployment-domains.md)
- [launch-handoff.md](./launch-handoff.md) — **your manual steps** (automated work already done)
- [production-supabase-migration-order.md](./production-supabase-migration-order.md)
- [store-listing-copy.md](./store-listing-copy.md)
- [vercel-production-env.template](./vercel-production-env.template)
- [../security/deployment-hardening-checklist.md](../security/deployment-hardening-checklist.md)
