# Profile completion (tORP v0.3)

## Source of truth

Completion is computed only from **persisted `torp_profiles` data** exposed as the client/API DTO (`profileRowToClientDto` in `serverProfile.js`). **WorkOS IdP fields are not merged in** for the checklist: if `email` / `first_name` / etc. are empty in the database, the step stays incomplete until the user saves via **PATCH `/api/me/profile`**, onboarding, or the **WorkOS callback upsert** (which does write IdP name/email/photo into the row on sign-in).

## Steps → database fields

Core steps (all signed-in account types):

| Step id    | DTO fields checked                         | DB columns / JSON metadata        |
|-----------|---------------------------------------------|-----------------------------------|
| **name**  | `firstName`, `lastName` (both non-empty)   | `first_name`, `last_name`         |
| **display** | `displayName`                            | `display_name`                    |
| **email** | `email`                                     | `email`                           |
| **photo** | `avatarUrl` (not placeholder / empty art)   | `profile_photo_url`               |
| **about** | `bio` **or** `banner` (any trimmed text)   | `bio`, `banner`                   |
| **onboarding** | `onboardingCompleted` true           | `onboarding_completed`            |

**Sponsor** (`accountIntent === 'sponsor_user'` from column `account_intent`):

| Step id         | DTO fields        | DB / metadata        |
|----------------|-------------------|----------------------|
| **sponsor_org** | `sponsorOrgName`  | `metadata.sponsorOrgName` |
| **sponsor_site** | `sponsorWebsite` | `metadata.sponsorWebsite` |

Admin-only or internal platform roles do not add extra checklist rows.

## How completion is calculated

- Implementation: `web/src/lib/profile/profileCompletion.js` — `computeProfileCompletion(profileDto)`.
- **`mergeProfileWithWorkOSUser`** remains exported for **display-only** UIs that want IdP fallbacks; it is **not** used for completion %.
- **Counts**: `completed` = steps passing their `check`; `total` = step count; `percentage` = `round(completed/total*100)`; `nextStep` = first incomplete step; `isComplete` = all done.
- **Server**: `GET /api/me` includes `profileCompletion` using the same function on the loaded row DTO.
- **Client**: `TopApp` uses `useMemo(() => computeProfileCompletion(profile), …)` so the UI matches the API after edits and refresh.

## Home page notice

- **Placement**: Inside `.homeHeroBackdrop`, above the welcome card (`TopApp.js`).
- **Visibility**: Signed-in user and `completion.isComplete === false` (`HomeProfileProgressNotice.jsx`).
- **CTA**: “Continue setup” → `/onboarding`, or “Finish profile” → `/profile?edit=1` (+ optional `focus=`).

## Profile page

- **Component**: `ProfileCompletionPanel.jsx` — bar + timeline; actions use the same step model.

## Extension points

- Stable step `id` values for analytics: `name`, `display`, `email`, `photo`, `about`, `onboarding`, `sponsor_org`, `sponsor_site`.
- Optional future: cache `completion_percentage` on the row for SQL reporting.
