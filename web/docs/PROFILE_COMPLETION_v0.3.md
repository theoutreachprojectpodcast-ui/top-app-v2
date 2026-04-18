# Profile completion (tORP v0.3)

## Source of truth

Completion is computed only from **persisted `torp_profiles` data** exposed as the client/API DTO (`profileRowToClientDto` in `serverProfile.js`). **WorkOS IdP fields are not merged in** for the checklist: if `email` / `first_name` / etc. are empty in the database, the step stays incomplete until the user saves via **PATCH `/api/me/profile`**, onboarding, or the **WorkOS callback upsert** (which does write IdP name/email/photo into the row on sign-in).

Tier and billing status on the DTO come from the server (Stripe / membership pipeline), not from optimistic client edits to `membershipTier` / `membershipBillingStatus`.

## Step order (core → sponsor-only → membership → onboarding)

1. **Core** (all signed-in users): name, display, email, **account_intent**, photo, about, **identity**
2. **Sponsor-only** (when saved `account_intent` normalizes to `sponsor_user`): sponsor_org, sponsor_site
3. **membership** — billing/tier aligned with saved intent
4. **onboarding** — `onboarding_completed`

## Steps → database fields

Core steps:

| Step id | DTO fields checked | DB columns / JSON metadata |
|--------|---------------------|----------------------------|
| **name** | `firstName`, `lastName` (both non-empty) | `first_name`, `last_name` |
| **display** | `displayName` | `display_name` |
| **email** | `email` | `email` |
| **account_intent** | normalized `accountIntent` non-empty | `account_intent` (persisted via PATCH when provided; onboarding also sets it) |
| **photo** | `avatarUrl` (not placeholder / empty art) | `profile_photo_url` |
| **about** | `bio` **or** `banner` (any trimmed text) | `bio`, `banner` |
| **identity** | `missionStatement` **or** `identityRole` | metadata (e.g. `missionStatement`, `identityRole`) |

**Sponsor** (`normalizePublicAccountIntent(accountIntent) === 'sponsor_user'`):

| Step id | DTO fields | DB / metadata |
|--------|------------|---------------|
| **sponsor_org** | `sponsorOrgName` | `metadata.sponsorOrgName` |
| **sponsor_site** | `sponsorWebsite` | `metadata.sponsorWebsite` |

**membership** — `membershipTier`, `membershipBillingStatus`, plus intent and sponsor onboarding signals:

- If **no** saved intent yet, the step is **complete** (users are not blocked before choosing a path).
- **free_user**: tier must be `free`.
- **support_user** / **member_user**: tier and billing must match (`support`/`member` + `active`).
- **sponsor_user**: complete if `onboardingStatus === needs_review` **or** `sponsorOnboardingPath === application`; else tier `sponsor` and billing `active`.

UI routes this step to **membership / billing** (`actionKind: "membership"`), not the profile editor.

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
- **CTA**: “Continue setup” → onboarding, “Finish profile” → profile edit (with `focus=` when applicable), **membership** → opens membership journey when `nextStep.actionKind === "membership"`.

## Profile page

- **Component**: `ProfileCompletionPanel.jsx` — bar + timeline; actions use the same step model (including membership CTA).

## Extension points

- Stable step `id` values for analytics: `name`, `display`, `email`, `account_intent`, `photo`, `about`, `identity`, `sponsor_org`, `sponsor_site`, `membership`, `onboarding`.
- Optional future: cache `completion_percentage` on the row for SQL reporting.
