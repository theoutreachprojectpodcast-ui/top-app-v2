# Closed testing → Production access

For **personal** Google Play developer accounts created after **November 13, 2023**, Production is locked until:

1. A **closed testing** release is live
2. At least **12 testers** are **opted in** (not just emailed)
3. Those 12 stay opted in for **14 continuous days**
4. You use **Dashboard → Apply for production** and pass Google’s questionnaire

Official help: https://support.google.com/googleplay/android-developer/answer/14151465

## Why Production is grayed out

Internal testing alone does **not** count. Closed testing with fewer than 12 opted-in testers does **not** unlock Production.

## This week (with few testers)

You cannot finish the 14-day gate in one week. Soft-launch via closed testing:

1. Testers tab → create list with **15+** Google accounts
2. Send the **opt-in URL**
3. Each person: Become a tester → Install from Play
4. Ask them to stay opted in and open the app a few times over 14 days

## After day 14 (with ≥12 opted-in)

1. Dashboard → **Apply for production**
2. Answer sections: closed test engagement, about the app, production readiness
3. Wait for email (often ≤7 days)
4. Production → Create release → promote closed-test AAB (or newer `versionCode`)
5. Send for review → Start rollout
6. Set Vercel env: `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` = public Play listing URL

## Organization accounts

Organization developer accounts are typically **exempt** from the 12×14 rule. You cannot convert personal → organization; a new org account needs a verified business (often D‑U‑N‑S) and is usually slower than finishing closed testing.

## Tester invite template

```
Please help unlock The Outreach Project on Google Play (~2 min):

1) Open this link on your Android phone (signed into Google)
2) Tap Become a tester / Accept
3) Install The Outreach Project from the Play listing
4) Stay opted in for 14 days — open the app a couple of times

[PASTE CLOSED TESTING OPT-IN URL]
```
