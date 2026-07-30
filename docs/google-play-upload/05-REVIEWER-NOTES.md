# Reviewer notes — App access & billing

Paste into Play Console **App access** / release review notes as needed.

## How the app works

The Outreach Project Android app (Capacitor) loads our production web application inside a native WebView. Sign-in uses WorkOS AuthKit inside the app. Account creation, membership purchases, sponsor packages, and all billing (Stripe Checkout and Customer Portal) happen on **https://theoutreachproject.app** in the **device system browser (Chrome)** — not as Google Play in-app products.

The app does **not** collect payment card details and does **not** use Google Play Billing for memberships.

Users share one account across web and mobile. After signup or payment on the web, they return to the app and can refresh account status to sync membership.

## Test account

Create a Production WorkOS user and paste credentials **only** in Play Console:

```
Email: (your appreview+…@theoutreachproject.app mailbox)
Password: (paste in Console only — never commit)
```

## Reviewer test steps

1. Launch app → Sign in with test account
2. Browse Home, Directory, Community, Profile — confirm content loads
3. Tap Upgrade / Manage billing → confirm Chrome opens the website (no in-app payment form)
4. Optional: complete membership on the website, return to app, refresh account status

## Billing disclosure (short)

```
Subscriptions and sponsor packages are purchased through our website (Stripe). The app does not offer Google Play in-app products.
```

## Support

support@theoutreachproject.app  
https://theoutreachproject.app/contact
