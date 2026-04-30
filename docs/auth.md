# Authentication and session (v0.6)

## Architecture

- **Root layout** wraps the App Router tree with `AuthSessionProvider` and `ProfileDataProvider` so session and profile state are not duplicated per page.
- **WorkOS** is the production identity provider. Session cookies are the source of truth; the client uses **`readNavAuthCache` / `writeNavAuthCache`** to avoid a signed-out flash while `/api/me` loads after navigation.
- **`GET /api/me`** and **`GET /api/auth/status`** must be called with **`credentials: "include"`** and typically **`cache: "no-store"`** on the client.

## Soft refresh and retries

`AuthSessionProvider.refresh({ soft: true })` runs on pathname changes and tab visibility. On a soft refresh, if the UI was authenticated but `/api/me` briefly returns unauthenticated, the client **retries** `/api/me` after short delays before clearing session state. Hard clears belong to explicit sign-out or a confirmed unauthenticated response after retries.

## Idle session (24 hours)

Sliding idle expiry is enforced server-side (see `web/src/lib/auth/sessionIdle.js` and the auth proxy). Client activity is bumped on navigation and via **`POST /api/auth/activity`** (throttled pointer events) so active users are not logged out at 24 hours unless they are actually idle.

## Further reading

- [WorkOS auth setup](./workos-auth-setup.md)
- [TORP v0.3 auth implementation](./torp-v03-auth-implementation.md)
- `web/docs/profile-auth-data-sync.md`
