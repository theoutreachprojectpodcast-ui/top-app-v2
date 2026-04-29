# Profile, auth, and completion sync (v0.5)

## What was fixed

- **WorkOS vs DB fields**: `mergeAccountEmailIntoProfileDto` now fills empty `email`, `firstName`, `lastName`, and `displayName` (derived from IdP names) from `GET /api/me` `user`, so the client profile state matches the signed-in session before every field exists in `torp_profiles`.
- **Completion parity**: `computeProfileCompletion` accepts optional `workOSUser` hints (same merge as `/api/me`). `GET /api/me` passes the WorkOS user into `computeProfileCompletion` so the server `profileCompletion` and client `TopApp` completion bar stay aligned with session-backed name/email when the DB row is still sparse.
- **Display name persistence**: `PATCH /api/me/profile` already maps `displayName` → `display_name`. `upsertProfileFromWorkOSUser` no longer overwrites a saved `display_name` when the user updates their profile (see `serverProfile.js`).
- **Onboarding redirect**: Auto-redirect to `/onboarding` for incomplete WorkOS onboarding is limited to the home route so `/profile`, `/podcasts`, and `/admin` are not interrupted mid-task.
- **Edit profile → save**: `persistProfile` PATCHes the merged payload; after success, the profile state is refreshed from the API DTO.

## Data flow

1. Browser: `ProfileDataProvider` → `useProfileData` fetches `/api/me` (credentials + `no-store`).
2. Server `GET /api/me`: `syncProfileEmailWithWorkOSUser` → `getProfileRowByWorkOSId` → `profileRowToClientDto` → merge WorkOS user for completion → JSON `{ profile, profileCompletion, user, entitlements }`.
3. Client merges `user` into `profile` via `mergeAccountEmailIntoProfileDto` before `profileFromApiDto`.
4. **Home / profile completion UI** uses `computeProfileCompletion(profile, { workOSUser: … })` when `sessionKind === 'workos'`.

## How to test

1. Sign in with WorkOS; open `/` — completion should not flash wildly incorrect counts if the DB row is new.
2. Edit **Display name** in Edit Profile → Save → refresh — name appears in header/profile and survives re-login.
3. From home progress notice, **Finish profile** → should land on `/profile?edit=1&focus=…` without opening sign-in when already authenticated.
