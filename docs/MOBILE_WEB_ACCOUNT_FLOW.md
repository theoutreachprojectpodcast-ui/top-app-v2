# Mobile web-account login, billing, and App Store compliance

The Outreach Project native apps (Capacitor iOS/Android) share accounts with **https://theoutreachproject.app** (production) and **https://qa.theoutreachproject.app** (QA). All paid flows stay on the website in the **system browser**; the app never collects card data or runs Apple IAP.

## Architecture

| Surface | Sign-in | Sign-up | Membership / billing |
|--------|---------|---------|----------------------|
| Mobile app (WebView) | WorkOS in **system browser** → deep link session transfer into WebView | Opens `/signup?mobile=1` in system browser → same transfer | Opens `/membership`, `/billing`, `/sponsor` in system browser |
| Mobile browser / desktop web | WorkOS in same tab | WorkOS in same tab | Stripe Checkout + Customer Portal on web |

After external signup or payment, users return via:

- Deep link (auth): `org.theoutreachproject.torp://auth/complete?token=…` (also `theoutreachproject://`)
- Universal link (optional): `https://theoutreachproject.app/mobile-auth/complete`
- Deep link (billing refresh): `org.theoutreachproject.torp://account/refresh`
- Web query: `?mobileReturn=account` on success/cancel/profile URLs
- In-app **Refresh account status** (fixed footer control via `MobileAccountReturnBridge`)

### WorkOS mobile redirect URI

Register in WorkOS dashboard (per environment):

- Production: `https://theoutreachproject.app/mobile-auth/callback`
- QA: `https://qa.theoutreachproject.app/mobile-auth/callback`
- Optional env override: `WORKOS_MOBILE_REDIRECT_URI`

Set `APPLE_TEAM_ID` on the web deploy for Universal Links (`/.well-known/apple-app-site-association`).

## Centralized redirect helpers

Implemented in `web/src/lib/capacitor/webAccountRedirects.js`:

- `openWebSignup()` → `/signup`
- `openWebLogin()` → `/login`
- `openWebMembership()` → `/membership`
- `openWebBilling()` → `/billing`
- `openWebSponsorMembership()` → `/sponsor`
- `requiresExternalWebAccountFlow()` → `true` on Capacitor native only

Origins resolve from `window.location.origin` in the WebView (QA vs prod follows `CAP_SERVER_URL` at build/sync time).

## Required web routes

| Route | Purpose |
|-------|---------|
| `/signup` | WorkOS sign-up alias |
| `/login` | WorkOS sign-in alias |
| `/membership` | Membership hub + Stripe checkout (browser only) |
| `/billing` | Stripe Customer Portal entry |
| `/profile` | Account + membership display |
| `/sponsor` | Redirects to sponsor packages |
| `/membership/success` | Post-checkout return + “Open app” CTA |
| `/membership/cancel` | Checkout canceled return |

## Apple IAP vs external purchase

**Current product model:** Digital membership (Support, Pro, Sponsor) unlocks community submission, saved orgs, podcast member content, and profile sync — entitlements stored server-side in Supabase and enforced on API routes (`web/src/lib/account/entitlements.js`).

**Compliance assessment (not legal advice — confirm with counsel before submission):**

1. **Reader / multiplatform account apps (Guideline 3.1.3):** Apps that let users access content purchased elsewhere often qualify for **no IAP** when the app does not sell digital goods inside the app and account creation/billing happen on the web. This matches our implementation: native CTAs open the website; no IAP products are configured.

2. **External Purchase Link entitlement (US storefront, post–Epic ruling):** Required only if the app **links** users from inside the app to **purchase digital goods** on the web with purchase-specific messaging. Our CTAs say “Continue on web” / open membership in browser — review whether Apple treats this as an external purchase link. If required, apply for the entitlement in App Store Connect before enabling purchase CTAs in production.

3. **If Apple rejects for digital subscriptions:** Alternatives are (a) add StoreKit IAP for iOS-only purchases with server receipt validation and cross-platform entitlement sync, or (b) remove upgrade CTAs from iOS and limit the app to sign-in + access for accounts already subscribed on web (higher review risk for prominent “Upgrade” buttons).

**Do not submit** until product/legal confirms IAP vs reader-app vs external-link posture.

## App Review Notes

Paste from [store-listing-copy.md](./store-listing-copy.md#app-store-review-notes-paste-into-review-notes).

## Export compliance (encryption)

See [legal/app-encryption-apple.md](./legal/app-encryption-apple.md). Summary:

- HTTPS/TLS only (WorkOS, Supabase, Stripe redirects, API)
- No proprietary or custom crypto
- `ITSAppUsesNonExemptEncryption` = **NO** in `Info.plist` (standard OS + TLS)

Third-party SDKs (Capacitor, WorkOS hosted auth) use platform TLS stacks; no additional ERN expected for standard HTTPS-only apps.

## Environment matrix

| Build | `CAP_SERVER_URL` | Web origin | Billing |
|-------|------------------|------------|---------|
| Local dev | `http://localhost:3001` or unset | localhost | Stripe test |
| QA native | `https://qa.theoutreachproject.app` | QA | Stripe test |
| Production native | `https://theoutreachproject.app` | Production | Stripe live |

Sync native projects after web changes:

```bash
cd web
CAP_SERVER_URL=https://qa.theoutreachproject.app pnpm exec cap sync
# or production URL for release builds
```

## Testing checklist

1. New user taps **Sign Up** in app → system browser opens web signup.
2. User creates account on web → account exists in WorkOS + Supabase.
3. User completes membership on web → Stripe webhook updates profile.
4. User returns to app → **Refresh account status** shows correct tier.
5. Existing paid web user signs in on mobile → entitlements immediate.
6. Free web user → free tier in app.
7. **Manage billing** → browser opens `/billing` / Stripe portal on web.
8. Cancel/change on web → refresh in app reflects update.
9. QA build uses QA URLs; production uses production URLs.
10. No payment form inside app WebView.
11. No Apple IAP products unless compliance review requires them.
12. App Review Notes and encryption answers prepared.

## Security

- Auth tokens: WorkOS session cookies on app origin (HTTPS only in prod).
- No logging of passwords, tokens, or card data.
- Membership gates: server-side only (`/api/me`, community POST, billing APIs).
- Stripe domains removed from Capacitor `allowNavigation` so checkout cannot load in WebView.
