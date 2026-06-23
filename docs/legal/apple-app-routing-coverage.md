# Apple App Store — App Routing & Coverage

**App:** The Outreach Project  
**Bundle ID:** `org.theoutreachproject.top`  
**Platform:** iOS (Capacitor native shell + remote WebView)  
**Production origin:** `https://theoutreachproject.app`  
**Last updated:** 2026-06-09  

Use this document when completing **App Store Connect → App Information → Review Notes**, answering reviewer questions about navigation, and confirming which Apple upload fields apply to this app.

**Related:** [MOBILE_WEB_ACCOUNT_FLOW.md](../MOBILE_WEB_ACCOUNT_FLOW.md) · [store-listing-copy.md](../store-listing-copy.md) · [IOS_XCODE_SETUP.md](../IOS_XCODE_SETUP.md) · [app-encryption-apple.md](./app-encryption-apple.md)

---

## 1. Apple “Routing App Coverage File” (.geojson) — not required

Apple’s **Routing App Coverage File** is a `.geojson` file uploaded in App Store Connect only when your app is a **Maps routing app** (turn-by-turn directions integrated with Apple Maps). Requirements:

- `MKDirectionsApplicationSupportedModes` key present in `Info.plist`
- GeoJSON contains a single `MultiPolygon` describing supported geographic regions

**The Outreach Project does not provide routing or navigation directions.** It is a Capacitor WebView that loads our website for resource discovery, community, podcasts, and account management.

| Check | This app |
|-------|----------|
| `MKDirectionsApplicationSupportedModes` in Info.plist | **No** |
| Turn-by-turn / transit / ride-share routing | **No** |
| Apple Maps routing integration | **No** |
| `.geojson` upload in App Store Connect | **Not required — leave blank** |

If App Store Connect shows a “Routing App Coverage File” upload slot, it appears because of a misconfigured capability. Remove any **Maps → Routing** capability in Xcode before submission.

---

## 2. What this document covers

This file is the **app routing and feature coverage map** for App Review:

- How users move through the iOS app (tabs, screens, URLs)
- Which flows stay in the WebView vs open Safari
- Deep links and return paths after web signup/billing
- Third-party domains the WebView may load
- Geographic and feature availability

---

## 3. Architecture summary

```
┌─────────────────────────────────────────────────────────┐
│  iOS native shell (Capacitor)                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  WKWebView → https://theoutreachproject.app       │  │
│  │  • Home, Directory, Community, Profile (in-app)   │  │
│  │  • WorkOS sign-in (in-app)                        │  │
│  │  • Sub-routes: /podcasts, /sponsors, /trusted…    │  │
│  └───────────────────────────────────────────────────┘  │
│  Safari (system browser) — external only:               │
│  • Sign-up, membership checkout, billing, sponsor pay   │
└─────────────────────────────────────────────────────────┘
         │                              ▲
         │ HTTPS API / auth             │ Deep link + refresh
         ▼                              │
   WorkOS · Supabase · Stripe (web)     │
```

The native binary does **not** embed a separate API layer. Product logic and entitlements are enforced on the server (`/api/*`, Supabase profile rows).

---

## 4. Primary in-app navigation (bottom dock)

The home shell (`TopApp`) exposes five bottom-nav destinations. All load inside the WebView on the production origin unless noted.

| Tab / label | Internal nav key | Primary route(s) | Auth required | Paid tier notes |
|-------------|------------------|------------------|---------------|-----------------|
| **Home** | `home` | `/` | No | Directory search, membership CTAs |
| **Trusted** | `trusted` | `/`, `/trusted`, `/trusted/[slug]` | No | Curated partner resources |
| **Community** | `community` | `/`, `/community` | Read: no · Post: yes | Pro membership required to submit stories (server-enforced) |
| **Profile** | `profile` | `/profile`, `/settings`, `/profile/edit` | Yes | Membership tier, billing CTAs |
| **Contact** | `contact` | `/contact` | No | Contact form |

**Header (home):** theme toggle, **Get the app** (web only), sign-in / account menu, sponsors shortcut.

---

## 5. In-app WebView route coverage

Routes below are reachable inside the iOS app WebView when loaded from `https://theoutreachproject.app`.

### 5.1 Public content

| Path | Purpose | Native notes |
|------|---------|--------------|
| `/` | Home, directory search, hero | Default launch URL |
| `/trusted` | Trusted resources catalog | |
| `/trusted/[slug]` | Resource detail | |
| `/community` | Community feed | |
| `/podcasts` | Podcast landing | |
| `/podcasts/guests` | Guest archive | |
| `/podcasts/guests/[slug]` | Guest detail | |
| `/podcasts/members` | Member podcast content | Entitlement-gated |
| `/sponsors` | Sponsor directory | |
| `/sponsors/[slug]` | Sponsor detail | |
| `/sponsors/apply` | Sponsor application | |
| `/contact` | Contact form | |
| `/privacy` | Privacy policy | |
| `/terms` | Terms of use | |
| `/mobile` | Mobile app download landing | |
| `/nonprofit/[ein]` | Nonprofit detail (directory) | |

### 5.2 Authentication (in WebView)

| Path | Purpose | Native notes |
|------|---------|--------------|
| `/login` | WorkOS sign-in alias | Primary **Sign in** flow in-app |
| `/sign-in`, `/sign-up` | WorkOS AuthKit handlers | Legacy aliases |
| `/callback` | WorkOS OAuth callback | Required for session |
| `/auth/sign-in`, `/auth/sign-up`, `/auth/logout` | AuthKit routes | |
| `/sign-out` | Sign out | Clears session |

**Sign-up on native:** Opens **Safari** → `/signup` (not in-app WebView checkout).

### 5.3 Account & membership (mixed WebView / Safari)

| Path | In WebView | Opens Safari on native |
|------|------------|-------------------------|
| `/profile` | Yes | — |
| `/settings` | Yes | — |
| `/profile/edit` | Yes | — |
| `/onboarding` | Yes (web) | Native upgrade CTAs prefer external `/membership` |
| `/signup` | Web only via Safari | **Yes** — account creation |
| `/membership` | Web browser only for checkout | **Yes** — upgrades |
| `/membership/success` | Return page after Stripe | Opened in Safari |
| `/membership/cancel` | Checkout canceled | Opened in Safari |
| `/billing` | Web browser for portal | **Yes** — manage billing |
| `/sponsor` | Redirects to sponsor packages | **Yes** — sponsor membership |

### 5.4 Admin (restricted)

| Path | Purpose |
|------|---------|
| `/admin/*` | Platform admin console | Visible only to privileged staff accounts |

---

## 6. External browser routing (native iOS only)

When running inside the Capacitor shell, these actions call `Browser.open()` (Safari) via `web/src/lib/capacitor/webAccountRedirects.js`:

| User action | Opens in Safari |
|-------------|-----------------|
| Create account / Sign up | `{origin}/signup?returnTo=…` |
| Upgrade / Become a member | `{origin}/membership?mobileReturn=account` |
| Support / Pro / Sponsor membership purchase | `{origin}/membership` or `{origin}/sponsor` |
| Manage billing | `{origin}/billing?mobileReturn=account` |
| Become a sponsor (paid packages) | `{origin}/sponsor?mobileReturn=account` |

Production `{origin}` = `https://theoutreachproject.app`  
QA `{origin}` = `https://qa.theoutreachproject.app` (TestFlight/internal builds only)

**No payment UI, Stripe Checkout, or Apple IAP appears inside the WebView.**

---

## 7. Deep links & return paths

| Mechanism | Value | When used |
|-----------|-------|-----------|
| Custom URL scheme | `org.theoutreachproject.top://account/refresh` | Web success pages → reopen app |
| Query flag | `?mobileReturn=account` | After web signup/billing; triggers in-app refresh |
| Checkout return | `?checkout=success` / `?checkout=cancel` | Stripe return URLs |
| In-app control | **Refresh account status** | `MobileAccountReturnBridge` after Safari closes |

Registered in `Info.plist` → `CFBundleURLSchemes`: `org.theoutreachproject.top`

---

## 8. Allowed third-party WebView navigation

Configured in `web/capacitor.config.js` → `server.allowNavigation` (production sync):

| Domain / pattern | Purpose |
|------------------|---------|
| `https://theoutreachproject.app` | App origin |
| `https://*.workos.com` | Hosted authentication |
| `https://api.workos.com` | Auth API |
| `https://*.supabase.co` | Storage / assets |

**Explicitly excluded from WebView:** `checkout.stripe.com`, `billing.stripe.com` (billing opens in Safari).

---

## 9. Geographic & feature coverage

### 9.1 Service geography

| Area | Coverage |
|------|----------|
| **App availability** | All countries where App Store distributes the app (per App Store Connect pricing/availability) |
| **Primary audience** | United States — veterans, first responders, families, supporters |
| **Directory data** | US nonprofit EIN-based directory (IRS-style identifiers) |
| **Language** | English (U.S.) for v1 |

This is **not** a maps routing app. Location is not used for turn-by-turn directions. The app does not declare background location or routing modes.

### 9.2 Feature coverage by account type

| Feature | Free account | Support tier | Pro (Member) tier | Sponsor tier |
|---------|--------------|--------------|-------------------|--------------|
| Browse directory & trusted resources | Yes | Yes | Yes | Yes |
| Community feed (read) | Yes | Yes | Yes | Yes |
| Community story submit | No | No | Yes (server gate) | Yes (staff override) |
| Save organizations | Limited | Yes | Yes | Yes |
| Profile sync web ↔ mobile | Yes | Yes | Yes | Yes |
| Podcast member content | No | Yes* | Yes | Yes |
| Purchase / upgrade in iOS app | No — web only | No — web only | No — web only | No — web only |

\*Exact entitlements read from Supabase profile via `/api/me` — not hardcoded in the app binary.

---

## 10. App Review test script

Use a Production WorkOS test account (credentials in App Store Connect Review Notes only — never in git).

1. **Launch** → splash (brand mark on `#F5F7F6`) → home loads `theoutreachproject.app`
2. **Sign in** → WorkOS hosted screen in WebView → return to home signed in
3. **Home** → run directory search → open nonprofit detail
4. **Trusted** tab → open a resource detail page
5. **Community** tab → browse feed (submit requires Pro)
6. **Profile** tab → confirm name, email, membership tier from server
7. **Upgrade** → Safari opens `/membership` — **no** in-app payment form
8. **Manage billing** (if subscribed on web) → Safari opens `/billing`
9. Return to app → tap **Refresh account status** → tier updates
10. **Contact** tab → submit or view form
11. **Sign out** → session cleared

---

## 11. Paste into App Store Connect — Review Notes

Copy the block below into **App Store Connect → App → App Review Information → Notes**.

```
APP ROUTING & COVERAGE (The Outreach Project — org.theoutreachproject.top)

NOT A MAPS ROUTING APP: No MKDirectionsApplicationSupportedModes, no .geojson routing coverage file. This is a Capacitor WebView loading https://theoutreachproject.app.

NAVIGATION: Bottom tabs — Home (directory), Trusted, Community, Profile, Contact. Sub-routes include /podcasts, /sponsors, /trusted/[slug], /nonprofit/[ein].

AUTH: Sign-in uses WorkOS AuthKit inside the WebView. Sign-up, membership purchase, sponsor packages, and billing open in Safari on the website — not in-app. No Apple IAP. No in-app payment forms.

ACCOUNT SYNC: Shared WorkOS account with the website. After web signup/payment, user returns via org.theoutreachproject.top://account/refresh or taps Refresh account status in the app.

EXTERNAL DOMAINS IN WEBVIEW: theoutreachproject.app, WorkOS (*.workos.com), Supabase (*.supabase.co). Stripe is NOT loaded in the WebView.

TEST ACCOUNT:
Email: [your appreview+ mailbox]
Password: [paste here — not in git]

STEPS: Launch → Sign in → browse tabs → tap Upgrade → confirm Safari opens website → return and refresh account.

Support: support@theoutreachproject.app
Privacy: https://theoutreachproject.app/privacy
Terms: https://theoutreachproject.app/terms
```

---

## 12. App Store Connect checklist (routing-related)

| Field / item | Action for this app |
|--------------|---------------------|
| Routing App Coverage File (.geojson) | **Leave empty** — not a routing app |
| Maps routing capability in Xcode | **Off** |
| URL schemes | `org.theoutreachproject.top` (account refresh) |
| Associated Domains / Universal Links | Optional future enhancement; v1 uses custom scheme |
| Sign in with Apple | Not used — WorkOS AuthKit |
| In-App Purchase | Not configured — billing on web |
| Encryption | `ITSAppUsesNonExemptEncryption` = NO — see app-encryption-apple.md |
| Photo / Camera usage strings | Profile & community photo upload |

---

## 13. Change log

| Date | Change |
|------|--------|
| 2026-06-09 | Initial routing & coverage document for App Store submission |

When adding new top-level routes or external-browser flows, update sections 5–6 and notify App Review if behavior changes materially.
