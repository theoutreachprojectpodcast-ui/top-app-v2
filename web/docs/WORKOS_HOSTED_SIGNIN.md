# Enable hosted sign-in (WorkOS AuthKit)

The app uses **WorkOS AuthKit** for production sign-in: users are sent to WorkOS’s **hosted** auth UI, then return to `/callback`. Local **demo** email/password is only used when AuthKit is not configured.

## 1. WorkOS dashboard

1. Open [WorkOS Dashboard](https://dashboard.workos.com) → your environment.
2. Under **Redirects**, add a **Redirect URI** that matches the app callback vars exactly (including `http` vs `https` and port):
   - `WORKOS_REDIRECT_URI`
   - `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
   - Default in `web/.env.local.example`: `http://localhost:3000/callback` for `pnpm dev`.
   - If you use `pnpm dev:alt` (port 3001), add `http://localhost:3001/callback` and set both vars accordingly.
3. Configure **Sign-in** / **AuthKit** and any social connections (e.g. Google) you want on the hosted screen.
4. Set a **Logout redirect** URI if you use sign-out (see AuthKit docs).

## 2. Environment variables (`web/.env.local`)

Copy `web/.env.local.example` and set at least:

| Variable | Notes |
|----------|--------|
| `WORKOS_API_KEY` | Server secret from the dashboard |
| `WORKOS_CLIENT_ID` | Client ID from the dashboard |
| `WORKOS_COOKIE_PASSWORD` | **≥ 32 characters** (encrypts the session cookie). e.g. `openssl rand -base64 24` |
| `WORKOS_COOKIE_DOMAIN` | Production shared domain (`theoutreachproject.app`) for cross-subdomain sessions |
| `WORKOS_REDIRECT_URI` | Server callback URI (`.../callback`) |
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

## QA (Vercel)

Set `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` to the QA origin (see `web/.env.local.example`). **Demo** auth stays on for Preview and for stable QA hostnames (`qaDeploymentContext`). For `/admin` on QA without copying production `PLATFORM_ADMIN_EMAILS`, set server-only **`QA_PLATFORM_ADMIN_EMAILS`** (comma-separated).

**Admin sign-in:** Bootstrap emails in `adminPolicy.js` (`andy@volentelabs.com`, `jmelching1@gmail.com`, `hodge5403@gmail.com`, etc.) may use **WorkOS (SSO)** or email-only magic link on `/admin-login`. The **Sign in with WorkOS (SSO)** button uses `bootstrap=1` so AuthKit is **not** pinned to `WORKOS_ORGANIZATION_ID` (WorkOS otherwise shows *“This account is not authorized to sign in”* for users who are not org members yet). After callback, the app still accepts those sessions via `sessionAuthorizedForWorkOS` and promotes them to `platform_role: admin`.

**If you still see “not authorized” on the WorkOS screen:**

1. Use **`/admin-login`** → **Sign in with WorkOS (SSO)** (not the public home sign-in), or sign in with an approved admin email so `loginHint` skips org pinning.
2. In WorkOS Dashboard → **User Management** → your organization → **Users** → **Invite user** and add each admin email (`andy@volentelabs.com`, etc.).
3. Under **Authentication** / org security, ensure at least one method admins can use is enabled (e.g. **Email + password**, **Magic Auth**, or **Google**) — not **SSO only** unless that user exists in your IdP.
4. **Create account** (`/api/auth/workos/signup`) does **not** pin `WORKOS_ORGANIZATION_ID` (new users are not org members yet). After `/callback`, the app adds them to the org via the WorkOS API when `WORKOS_ORGANIZATION_ID` is set.
5. For member **sign-in**, users should be in the org when `WORKOS_ORGANIZATION_ID` is set; keep that env var aligned with the org id in the dashboard.
