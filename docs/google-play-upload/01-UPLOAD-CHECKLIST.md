# Play Console upload checklist

Use with the files in this folder. Check items as you complete them.

## A. Build

- [ ] `versionCode` bumped in `web/android/app/build.gradle` (never reuse)
- [ ] `pnpm run mobile:store:prep`
- [ ] `pnpm run mobile:android:bundle`
- [ ] Confirm script output: `package=com.theoutreachproject versionCode=…`
- [ ] Locate AAB: `web\android\app\build\outputs\bundle\release\app-release.aab`

## B. Store listing

- [ ] App name + short description + full description — paste from `02-LISTING-COPY.md`
- [ ] App icon `assets/icons/icon-512.png`
- [ ] Feature graphic 1024×500 (already in Console if previously uploaded)
- [ ] Phone screenshots (min 2) from `assets/phone-screenshots/`
- [ ] Privacy URL: https://theoutreachproject.app/privacy
- [ ] Support email: support@theoutreachproject.app

## C. Policy → App content

Paste answers from `04-POLICY-FORMS.md` and `05-REVIEWER-NOTES.md`:

- [ ] App access (login required + reviewer credentials — Console only)
- [ ] Ads → **No**
- [ ] Content rating (IARC) — disclose community / UGC
- [ ] Data safety
- [ ] Target audience — not directed at children under 13
- [ ] Review note: Stripe on web, not Play Billing

## D. Closed testing release

- [ ] Testing → Closed testing → Create new release
- [ ] Upload `app-release.aab`
- [ ] Paste release notes from `03-RELEASE-NOTES.md`
- [ ] Review release → Start rollout to Closed testing
- [ ] Testers tab → email list (aim **15+** Google accounts)
- [ ] Send **opt-in link**; each person must Accept + Install
- [ ] Confirm opted-in count ≥ **12**

## E. Production (after 12 × 14 days)

See `06-CLOSED-TESTING-TO-PRODUCTION.md`.

- [ ] Keep ≥12 opted-in for **14 continuous days**
- [ ] Dashboard → Apply for production
- [ ] Answer questionnaire
- [ ] After approval: Production → promote AAB → Send for review → Start rollout
- [ ] Set `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` on Vercel production

## Warnings you can ignore

| Console warning | Action |
|-----------------|--------|
| No deobfuscation file | Safe — R8/minify is off |
| No testers for release | Add Testers list + opt-in (required) |
| Production grayed out | Complete closed testing gate first |
