# Profile follow-up: settings page, saved orgs, membership card (TOP v0.3)

## Checkpoint

Before this pass: commit `checkpoint: profile-completion-followup-settings-and-saved-org-fixes (TOP v0.3)`.

## Home hero / gray bar

The progress notice and welcome card sit in a shared **`.homeHeroBackdrop__content`** stack (`flex` + `gap`). The notice no longer uses a bottom margin that exposed a band of backdrop/scrim between the two surfaces.

## Clickable profile completion steps

- `web/src/lib/profile/profileCompletion.js` — each step includes `editFocus` (`name`, `displayName`, `email`, `avatar`, `about`, `sponsorOrg`, `sponsorSite`, or `null` for onboarding).
- `ProfileCompletionPanel` — incomplete **profile-edit** and **onboarding** rows are `<button>`s that call `onEditProfileFocus(focusKey)` or `onOpenOnboarding()`.
- `TopApp` — `openEdit(focusKey)` sets draft, optional focus, opens modal; `useEffect` scrolls `[data-profile-edit-focus="…"]` into view.

## Green highlights in Edit Profile

- `getIncompleteEditFocusIds(editDraft, workOSUser)` drives which chunks get **`.profileEditChunk--incomplete`** (green border/soft fill).
- Highlights follow the **current draft** so they clear as the user types; saving persists to Supabase via existing `PATCH /api/me/profile`.

## Edit Profile modal additions

- **Display name**, **bio** (textarea), **sponsor** org + website when `accountIntent === sponsor_user`.
- **WorkOS**: email field is read-only (sign-in source of truth).
- Link to **`/settings`** for deeper account controls.

## Saved organizations data

- **Root cause (2026-07)**: `resolveSavedOrganizationDirectoryRows` **skipped** EINs with no `nonprofits_search_app_v1` row or with `ein_identity_verified === false`. Profile UI then filled the intentional placeholder **"Saved organization"**. Accounts whose favorites were still in the session search cache looked fine; accounts loading profile cold with unverified/missing search-view rows looked broken.
- **Fix**: Always return one row per saved EIN. Resolve names from directory → enrichment → `nonprofit_profiles.display_name_override`. Unverified identity no longer hides saved names. True misses use **"Organization unavailable"** with remove action.
- **WorkOS**: `GET /api/me/saved-orgs/cards` (admin client) returns joined `rows` + typed `items`; `PUT /api/me/saved-orgs` validates new EINs and returns resolved rows for immediate UI update.
- **Repair**: `pnpm --dir web run repair:saved-org-names` (optional `--apply-normalize`); SQL `saved_org_name_resolution_2026_07.sql`.
- **Cards**: `SavedOrganizationCard` shows canonical name or unavailable state; **NonprofitCard** for resolved rows.

## Membership card on profile

- `MembershipAtAGlance` **`surface="profile"`** (`membershipAtAGlance--profileCompact`): current plan label, billing status line, tier hint, **Manage billing** (WorkOS), link to **`/settings#account-membership`**.
- **`surface="settings"`** (default on Settings page): full tier grid (signed out), Stripe checkout panel, demo tier pills, benefits.

## Settings page

- Route: **`/settings`** → `TopApp` with `initialNav="settings"`.
- UI: `AccountSettingsPage` — email/sign-in copy, display name + location saves (`persistProfile`), wrapped membership section, `AccountInfoCard`, saved-org summary link to profile.
- Header account menu: **Settings** → `router.push('/settings')` (replaces old “Profile settings” opening the edit modal).
- Onboarding guard: users on **`/settings`** are **not** redirected to `/onboarding` for incomplete onboarding.

## Routing notes

- `useEffect` on `pathname` sets `nav` to `settings` or `profile` when URL matches.
- Footer **Home** / **Profile** use `router.push` when not already on `/` or `/profile` so shell state matches the URL.

## Persistence

- No change to identity rules: WorkOS user maps to one Supabase profile row; `PATCH /api/me/profile` + webhooks remain authoritative for membership tier.
- `profileToApiPatch` now includes **`sponsorOrgName`** and **`sponsorWebsite`** in metadata-related payload fields supported by the API.
