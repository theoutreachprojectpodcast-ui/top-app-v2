# Policy & App content forms — Google Play

Complete under **Policy → App content**. Do not commit real reviewer passwords to git.

## Ads

**Does your app contain ads?** → **No**

## App access

**All or some functionality is restricted** → Yes (sign-in required)

Provide a dedicated Production WorkOS reviewer account in the Console form only:

1. Create account at https://theoutreachproject.app (mailbox you control)
2. Complete onboarding
3. Paste **email + password** into Play **App access** only

Example email pattern (do not use as real password storage):

```
appreview+android@theoutreachproject.app
```

## Target audience

- Not directed at children under 13
- Attractive to adults (veterans, first responders, supporters)

## Content rating (IARC)

Answer honestly. Disclose:

- Social / community features
- User-generated content (posts, comments, photos)
- No gambling, no target of children

## Data safety

| Data type | Collected | Shared | Purpose | Optional? |
|-----------|-----------|--------|---------|-----------|
| Email address | Yes | No | Account | Required for sign-in |
| Name | Yes | No | Profile | Optional in profile |
| Photos | Yes | No | Profile / community | Optional |
| User-generated content | Yes | No | Community | Optional |
| Purchase history | Yes | No | Membership status | Optional (paid tiers) |
| Device or other IDs | No | — | — | — |
| Location | No | — | — | — |

Additional answers:

- **Data encrypted in transit:** Yes (HTTPS)
- **Users can request deletion:** Yes — in-app Settings / support@theoutreachproject.app / contact form
- **Ads:** No
- **Account required:** Yes for most features

**Payments:** Membership and sponsor packages are processed on the **website via Stripe**, **not** Google Play Billing. State this if asked about in-app purchases / Play Billing.

## Privacy & terms URLs

- Privacy: https://theoutreachproject.app/privacy
- Terms: https://theoutreachproject.app/terms
- Full drafts in repo: `docs/legal/privacy-policy.md`, `docs/legal/terms-and-conditions.md`
