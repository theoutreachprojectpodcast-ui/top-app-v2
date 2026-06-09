# Store listing copy (draft)

Use or edit for App Store Connect and Google Play Console. Replace `[support@…]` with your real support email.

---

## App name

**The Outreach Project**

## Subtitle (App Store, 30 chars max)

**Veteran resource network**

## Short description (Google Play, 80 chars)

Mission-first resources for veterans, first responders, and supporters.

## Full description

The Outreach Project (TOP) connects veterans, first responders, and supporters with trusted nonprofits, community stories, podcasts, and membership benefits — in one clear, mobile-first experience.

**Discover**
- Search the nonprofit directory by cause, location, and need
- Browse trusted resource partners vetted for the TOP community
- Explore sponsor organizations supporting the mission

**Connect**
- Join community conversations and share stories
- Save organizations and favorites to your profile
- Stay informed with in-app notifications

**Membership**
- Support the mission with optional Support or Pro membership tiers
- Manage billing securely through Stripe

**Built for clarity under pressure**
TOP is designed for quick navigation when it matters most — with a trust-driven approach to resource discovery.

Sign in with your TOP account to sync profile, saved items, and membership across web and mobile.

Questions? Contact us at [support@theoutreachproject.app] or via the in-app contact form.

Privacy Policy: https://theoutreachproject.app/privacy  
Terms of Use: https://theoutreachproject.app/terms  

**Full legal documents (store submission):** [docs/legal/privacy-policy.md](./legal/privacy-policy.md) · [docs/legal/terms-and-conditions.md](./legal/terms-and-conditions.md)

---

## Keywords (App Store, comma-separated)

veterans,first responders,nonprofit,directory,resources,community,podcast,membership,support

## Category suggestions

- **Primary:** Lifestyle or Social Networking
- **Secondary:** Health & Fitness (if emphasizing wellness resources)

## App Store review notes (paste into Review Notes)

Full app routing & coverage reference: **[legal/apple-app-routing-coverage.md](./legal/apple-app-routing-coverage.md)** (includes paste block §11).

**Routing App Coverage File (.geojson):** Not applicable — not a Maps routing app.

The Outreach Project mobile app (Capacitor iOS/Android) loads our production web application inside a native WebView. **Sign-in** uses WorkOS AuthKit inside the app. **Account creation, membership purchases, sponsor packages, and all billing** (Stripe Checkout and Customer Portal) happen only on **https://theoutreachproject.app** in the **device system browser** (Safari / Chrome) — not inside the app WebView. The app does **not** collect payment details, does **not** show Apple In-App Purchase products, and does **not** embed Stripe checkout.

Users share one account across web and mobile. After completing signup or payment on the web, they return to the app and tap **Refresh account status** (or use the deep link on the web success page) to sync membership from the server.

**Test account** (create in Production WorkOS — do not commit password to repo):

Email: `appreview+YOURDOMAIN@theoutreachproject.app` (example — use a mailbox you control)  
Password: *(paste into App Store Review Notes / Play App access only)*

Steps to test:
1. Launch app → **Sign in** with test account (WorkOS in WebView)
2. Browse Home, Directory, Community, Profile tabs — verify membership tier matches web account
3. Tap **Upgrade** or **Manage billing** → confirm Safari/Chrome opens the website (no in-app payment form)
4. Optional: complete membership on the website, return to app, tap **Refresh account status**

Support: [support@theoutreachproject.app]

## Google Play — App access (login required)

All users must sign in with a WorkOS account. Provide the same test credentials as above in the Play Console **App access** form.

## Data safety / App Privacy (summary for forms)

See **[store-policy-forms.md](./store-policy-forms.md)** for full Apple App Privacy and Google Data safety answers.

| Data type | Collected | Purpose |
|-----------|-----------|---------|
| Email, name | Yes | Account, profile |
| User-generated content | Yes | Community posts, profile |
| Purchase history | Yes | Membership status (via Stripe) |
| Device identifiers | No | — |
| Location | No | — |

Data encrypted in transit (HTTPS). Users can request account help via contact form.

## What's New (version 1.0)

Initial release of The Outreach Project mobile app — directory search, trusted resources, community, podcasts, and membership on iOS/Android.
