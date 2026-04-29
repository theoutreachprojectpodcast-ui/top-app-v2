# tOP v0.5 WorkOS Auth Setup

This runbook covers full WorkOS authentication setup for local, QA, production, and mobile WebView usage.

## Required WorkOS Dashboard Settings

- Application type: hosted AuthKit for web app.
- **Organization:** Use a single WorkOS Organization for **The Outreach Project**. Copy its Organization ID (`org_…`) into `WORKOS_ORGANIZATION_ID` in Vercel so sign-in, sign-up, and API sessions are pinned to that org only.
- **Session length:** In WorkOS, align session / refresh-token policy with your product policy. The app also enforces a **sliding idle timeout** (default **24 hours** without HTTP requests) via `TOP_SESSION_IDLE_MS`; after idle it redirects to `/sign-out`. Set `TOP_SESSION_IDLE_MS=0` to disable only the app idle layer (WorkOS tokens still apply).
- Redirect URIs must include all active origins:
  - `http://localhost:3000/callback`
  - `http://localhost:3001/callback` (if using `dev:alt`)
  - `https://the-outreach-project-app-git-qa-the-outreach-project.vercel.app/callback` (QA)
  - `https://the-outreach-project-app.vercel.app/callback` (production)
- Logout redirect URI:
  - `https://the-outreach-project-app.vercel.app/`
- Ensure the WorkOS App provides:
  - API key (`sk_*`)
  - Client ID (`client_*`)

## Required Environment Variables

Set these in Vercel for each environment (Preview QA + Production):

- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `WORKOS_ORGANIZATION_ID` (`org_…` for The Outreach Project — **strongly recommended** for QA/production)
- `WORKOS_COOKIE_PASSWORD` (32+ chars)
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
- `TOP_SESSION_IDLE_MS` (optional; default `86400000` = 24h sliding idle → `/sign-out`; `0` disables)
- `APP_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See `web/.env.example` for a safe template.

## Auth Routes and Flows

- Sign in: `/api/auth/workos/signin`
- Create account: `/api/auth/workos/signup`
- Callback: `/callback`
- Sign out: `/sign-out`
- Current user/session hydrate: `/api/me`

Buttons in `TopApp` and subpage header call real WorkOS routes in QA/production. Demo-only local mode remains behind `NEXT_PUBLIC_ENABLE_DEMO_FLOWS`.

## How User Records Are Stored

On first successful callback (`/callback`), the app upserts internal profile rows keyed by:

- `workos_user_id`
- email, first/last name, display name
- membership fields
- onboarding status
- role fields (`platform_role`)

Core code:

- `web/src/lib/profile/serverProfile.js`
- `web/src/app/api/me/route.js`
- `web/src/app/api/me/profile/route.js`

## Role Model

- Public (logged out): public pages only.
- Member/User: authenticated WorkOS user.
- Admin: `platform_role=admin` or listed in `PLATFORM_ADMIN_EMAILS`.

Protected admin routes use:

- `web/src/lib/admin/adminRouteContext.js`
- `web/src/app/admin/layout.js`

## Mobile / Capacitor Notes

- Native icon and PWA install icon are separate from auth.
- WorkOS in WebView requires HTTPS callback origins registered in WorkOS.
- For Capacitor server URL testing, include that callback origin in WorkOS.
- Sign-out uses `/sign-out?returnTo=/` and clears session cookies.

## Verification Checklist

1. Open home while logged out.
2. Click `Sign in` -> redirects to WorkOS hosted auth.
3. Click `Create account` -> redirects to WorkOS hosted sign-up.
4. Complete callback -> `/api/me` returns `authenticated: true`.
5. Confirm profile row exists/updates in profile table.
6. Confirm member pages load as authenticated.
7. Confirm admin route redirects for non-admin users.
8. Sign out -> `/api/me` returns `authenticated: false`.
9. Run `pnpm --dir web build`.

## Known Troubleshooting

- If `withAuth` throws route/middleware coverage errors, use route auth helper fallback:
  - `web/src/lib/auth/workosRouteAuth.js`
- If WorkOS sign-in shows invalid client id:
  - verify `WORKOS_CLIENT_ID` starts with `client_`
  - verify redirect URI exact match in WorkOS dashboard.
