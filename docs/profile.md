# User profile (v0.6)

## Data model

- WorkOS (and demo) users map to **`torp_profiles`** via the server. Display name, bio, identity fields, and sponsor metadata are persisted through **`PATCH /api/me/profile`**.
- **`useProfileData`** (via `ProfileDataProvider`) owns profile state for the whole client session. **`persistProfile`** sends the API patch for WorkOS accounts and updates local React state from the JSON response.

## Completion checklist

- **`computeProfileCompletion`** in `web/src/lib/profile/profileCompletion.js` derives steps from the same fields stored in the database.
- The home hero progress notice is shown only when the user is authenticated **and** profile loading has finished, so counts are not shown against a half-hydrated row.

## Edit profile UX

- The edit modal saves with **Save** or **Enter** in single-line fields; **Enter** in a **textarea** or **file** input does not submit.
- On successful save, the modal closes and **`refresh({ soft: true })`** runs on the auth session so the header stays aligned with cookies.

## Related docs

- `web/docs/PROFILE_COMPLETION_v0.3.md`
- `web/docs/profile-auth-data-sync.md`
