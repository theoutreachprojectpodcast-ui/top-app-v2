# Production WorkOS Auth (Incident Repair v0.6)

## Incident audit summary

Date: 2026-05-05  
Production URL: `https://theoutreachproject.app`

Findings:

- `GET /api/auth/status` in production reports `workos: true` and service-role storage available.
- Direct route probes show both auth starts are live:
  - `/api/auth/workos/signin` returns `307` to WorkOS authorize URL.
  - `/api/auth/workos/signup` returns `307` to WorkOS authorize URL.
- Callback URL in live redirect is `https://theoutreachproject.app/callback`.
- One UI gap existed: some signed-out CTAs in `TopApp` still opened the local overlay instead of launching WorkOS.
- Env validation previously did not enforce `WORKOS_REDIRECT_URI` / cookie-domain requirements for production.

## Required production variables

- `WORKOS_API_KEY` (`sk_live_...`)
- `WORKOS_CLIENT_ID`
- `WORKOS_COOKIE_PASSWORD` (>= 32 chars)
- `WORKOS_COOKIE_DOMAIN=theoutreachproject.app`
- `WORKOS_REDIRECT_URI=https://theoutreachproject.app/callback`
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://theoutreachproject.app/callback`
- `NEXT_PUBLIC_APP_URL=https://theoutreachproject.app`
- `NEXT_PUBLIC_ADMIN_URL=https://admin.theoutreachproject.app`

## Required WorkOS dashboard URLs

Redirect URLs:

- `https://theoutreachproject.app/callback`
- `https://www.theoutreachproject.app/callback`
- `https://admin.theoutreachproject.app/callback` (if admin starts auth directly)

Logout URLs:

- `https://theoutreachproject.app`
- `https://admin.theoutreachproject.app` (if needed)

## Routing in app

- Start sign-in: `/api/auth/workos/signin` and alias `/auth/sign-in`
- Start sign-up: `/api/auth/workos/signup` and alias `/auth/sign-up`
- Callback: `/callback`
- Logout: `/sign-out` and alias `/auth/logout`

## Validation checklist

- Create account launches WorkOS sign-up from homepage, profile, and podcast flows.
- Sign-in launches WorkOS sign-in from same surfaces.
- Callback returns authenticated session and profile row exists in `torp_profiles`.
- Session survives refresh and cross-page navigation.
- Manual sign-out clears session and redirects safely.
