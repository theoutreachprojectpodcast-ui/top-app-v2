# Profile completion (tORP v0.3)

## Steps included

Core steps (all signed-in account types):

1. **name** — Non-empty `firstName` and `lastName` (profile row; WorkOS user may fill gaps via merge).
2. **display** — Non-empty `displayName`.
3. **email** — Non-empty `email` (same merge rule as name).
4. **photo** — Custom `avatarUrl` (not empty placeholder / not `EMPTY_PROFILE_AVATAR_URL` / not `avatar-placeholder.svg`).
5. **about** — Bio **or** banner/tagline with length ≥ 12 characters (`bio` or `banner`).
6. **onboarding** — `onboardingCompleted` true (Supabase-backed).

**Sponsor intent** (`accountIntent === 'sponsor_user'`, case-insensitive), two extra steps:

7. **sponsor_org** — `sponsorOrgName` non-empty.
8. **sponsor_site** — `sponsorWebsite` non-empty.

Admin-only or internal platform roles do not add extra checklist rows in this model.

## How completion is calculated

- Implementation: `web/src/lib/profile/profileCompletion.js` — `computeProfileCompletion(profile, workOSUser?)`.
- **Merge**: `mergeProfileWithWorkOSUser` fills missing `email` / `firstName` / `lastName` from the WorkOS session snapshot (matches server behavior).
- **Counts**: `completed` = steps passing their `check`; `total` = step count; `percentage` = `round(completed/total*100)`; `nextStep` = first incomplete step; `isComplete` = all done.
- **Server**: `GET /api/me` includes `profileCompletion` using the same function so API consumers and reporting can reuse the shape without duplicating rules.
- **Client**: `TopApp` uses `useMemo(() => computeProfileCompletion(profile, workosUserSnapshot), …)` so the UI updates after profile edits, avatar upload, and `/api/me` refresh.

## Home page notice

- **Placement**: Inside `.homeHeroBackdrop`, **above** `.card.cardHero` / `HomeWelcomeSection` (`TopApp.js`).
- **Visibility**: Rendered only when the user is signed in and `completion.isComplete` is false (`HomeProfileProgressNotice.jsx`).
- **Copy**: “**X out of Y steps complete**” plus a short hint and a single CTA (“Continue setup” → `/onboarding`, or “Finish profile” → profile tab + edit overlay).
- **Style**: `.homeProfileProgressNotice*` in `top-app.css` — subtle green border/background using `--color-success`.

## Profile page progress bar and timeline

- **Component**: `ProfileCompletionPanel.jsx` — summary line, bar (`.profileCompletionBar*`), ordered list timeline (`.profileCompletionTimeline*`).
- **States**: Completed rows use `.isDone`; the first incomplete step uses `.isNext` and “Suggested next step”.
- **Actions**: Primary/soft buttons for `onboarding` vs `profile-edit` next steps; `actionKind: 'none'` steps have no dedicated button (user still sees the row).

## Account-type differences

- **Free / support / member / pro**: Same six core steps; membership tier does not add checklist items in this pass (tier is orthogonal to this completeness model).
- **Sponsors**: Extra org + website steps when `accountIntent` is sponsor.
- **Staff/admin**: No extra user-facing steps; `platformRole` is not used to branch the checklist.

## Extension points (admin / account quality)

- Read **`profileCompletion`** from `GET /api/me` or re-run `computeProfileCompletion` on server-side profile DTOs for dashboards.
- Step `id` values are stable (`name`, `display`, `email`, `photo`, `about`, `onboarding`, `sponsor_org`, `sponsor_site`) for aggregation or funnel metrics.
- Optional future work: persist a cached `completion_percentage` on the profile row for SQL reporting (not required for correct UI today).
