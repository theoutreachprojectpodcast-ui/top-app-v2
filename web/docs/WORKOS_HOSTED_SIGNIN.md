# Enable hosted sign-in (WorkOS AuthKit)

The app uses **WorkOS AuthKit** for production sign-in: users are sent to WorkOS’s **hosted** auth UI, then return to `/callback`. Local **demo** email/password is only used when AuthKit is not configured.

## 1. WorkOS dashboard

1. Open [WorkOS Dashboard](https://dashboard.workos.com) → your environment.
2. Under **Redirects**, add a **Redirect URI** that matches **`NEXT_PUBLIC_WORKOS_REDIRECT_URI`** exactly (including `http` vs `https` and port).
   - Default in `web/.env.local.example`: `http://localhost:3001/callback` for `pnpm dev`.
   - If you use `pnpm dev:alt` (port 3000), add `http://localhost:3000/callback` and set the env var to that URL while developing on 3000.
3. Configure **Sign-in** / **AuthKit** and any social connections (e.g. Google) you want on the hosted screen.
4. Set a **Logout redirect** URI if you use sign-out (see AuthKit docs).

## 2. Environment variables (`web/.env.local`)

Copy `web/.env.local.example` and set at least:

| Variable | Notes |
|----------|--------|
| `WORKOS_API_KEY` | Server secret from the dashboard |
| `WORKOS_CLIENT_ID` | Client ID from the dashboard |
| `WORKOS_COOKIE_PASSWORD` | **≥ 32 characters** (encrypts the session cookie). e.g. `openssl rand -base64 24` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Must match the dashboard Redirect URI and your dev port (`/callback`) |

Optional tuning: `WORKOS_COOKIE_MAX_AGE`, `WORKOS_COOKIE_DOMAIN`, etc. — see `@workos-inc/authkit-nextjs` README.

## 3. Restart and verify

1. Restart the Next dev server after changing env.
2. Open `GET /api/auth/status` — **`workos`** should be `true` and **`workosMissingEnv`** should be `[]`.
3. In the app sign-in modal, you should see **WorkOS** buttons instead of the “hosted sign-in is not enabled” message.

## How it wires up in this repo

- **Proxy** (`web/src/proxy.js`, Next.js 16+ convention) runs **`authkitProxy()`** when configuration is complete (session refresh and `x-workos-middleware` for `withAuth()` in RSC).
- **Callback** (`web/src/app/callback/route.js`) runs **`handleAuth`** and syncs the user into Supabase.
- **Sign-in / sign-up** (`web/src/app/api/auth/workos/signin|signup/route.js`) call **`getSignInUrl` / `getSignUpUrl`** (hosted UI).

CLI tips: `web/docs/WORKOS_CLI.md` and `pnpm workos doctor`.
