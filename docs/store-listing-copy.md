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

---

## Keywords (App Store, comma-separated)

veterans,first responders,nonprofit,directory,resources,community,podcast,membership,support

## Category suggestions

- **Primary:** Lifestyle or Social Networking
- **Secondary:** Health & Fitness (if emphasizing wellness resources)

## App Store review notes (paste into Review Notes)

This app loads our production web application (https://theoutreachproject.app) inside a native Capacitor WebView. Authentication uses WorkOS AuthKit; membership billing uses Stripe Checkout on the web (no Apple In-App Purchase products).

**Test account**  
Email: [reviewer@example.com]  
Password: [provided separately]

Steps to test:
1. Launch app → sign in with test account
2. Browse Home, Directory, Community, Profile tabs
3. Optional: start membership checkout (Stripe test/live per environment)

Support: [support@theoutreachproject.app]

## Google Play — App access (login required)

All users must sign in with a WorkOS account. Provide the same test credentials as above in the Play Console **App access** form.

## Data safety / App Privacy (summary for forms)

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
