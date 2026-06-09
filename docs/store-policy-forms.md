# Store policy forms — App Privacy & Data safety

Use with [store-listing-copy.md](./store-listing-copy.md) and [legal/privacy-policy.md](./legal/privacy-policy.md) when completing **App Store Connect → App Privacy** and **Google Play Console → Data safety**.

**App ID:** `org.theoutreachproject.torp`  
**Privacy URL:** https://theoutreachproject.app/privacy  
**Support:** support@theoutreachproject.app

---

## Reviewer test account (both stores)

Create a **dedicated Production WorkOS user** (not a real member’s account):

1. Sign up at https://theoutreachproject.app with a mailbox you control (e.g. `appreview+ios@theoutreachproject.app`).
2. Complete onboarding if prompted.
3. Optionally attach a **Stripe test card** only if reviewers must complete checkout — otherwise note in review notes that checkout is optional and uses Stripe on the web (no IAP).
4. Paste **email + password** into App Store **Review Notes** and Play **App access** forms. Do not commit credentials to the repo.

---

## Apple — App Privacy (nutrition labels)

| Question area | Answer |
|---------------|--------|
| **Data linked to you** | Yes — account and user content |
| **Data used to track you** | No — no cross-app advertising tracking |
| **Contact info** | Email, name — **App functionality**, **Account management** |
| **User content** | Photos (optional profile/community), posts — **App functionality** |
| **Identifiers** | No advertising ID; session cookies for auth only |
| **Purchases** | Purchase history / subscription status — **App functionality** (via Stripe web; card data held by Stripe) |
| **Usage data** | Diagnostics / crash data only if Apple/Xcode crash reporting enabled (optional) |
| **Location** | Not collected |
| **Contacts / SMS / microphone** | Not collected |

**Third-party SDK disclosure:** WorkOS (auth), Stripe (checkout in browser), Supabase (data), Vercel (hosting). Data encrypted in transit (HTTPS).

**Photos:** Collected only when user uploads; linked to account.

---

## Google Play — Data safety

| Data type | Collected | Shared | Purpose | Optional? |
|-----------|-----------|--------|---------|-------------|
| Email address | Yes | No | Account | Required for sign-in |
| Name | Yes | No | Profile | Optional in profile |
| Photos | Yes | No | Profile / community | Optional |
| User-generated content | Yes | No | Community | Optional |
| Purchase history | Yes | No | Membership status | Optional (paid tiers) |
| Device or other IDs | No | — | — | — |
| Location | No | — | — | — |

- **Data encrypted in transit:** Yes  
- **Users can request deletion:** Yes — via support@theoutreachproject.app  
- **Committed to Play Families policy:** Only if you target children under 13 (default: **No** — service not directed to under-13)  
- **Ads:** No  
- **Account required:** Yes for most features  

**Payments note:** Subscriptions are processed on the **website via Stripe**, not Google Play Billing. State this in the questionnaire if asked about in-app purchases.

---

## Export compliance (Apple)

See **[legal/app-encryption-apple.md](./legal/app-encryption-apple.md)** for the full encryption document and App Store Connect answers.

Typical answer for HTTPS-only WebView apps using standard TLS: **Yes** encryption (HTTPS), **exempt** under mass-market / Category 5 Part 2 — no custom crypto. Confirm with counsel if you add non-standard crypto.

---

## Content rating

- **Apple:** Likely **12+** or **17+** if community UGC — complete questionnaire honestly (user-generated content, infrequent/mild mature themes).
- **Google (IARC):** Similar; disclose social features and UGC.

---

*Have qualified legal counsel review before submission.*
