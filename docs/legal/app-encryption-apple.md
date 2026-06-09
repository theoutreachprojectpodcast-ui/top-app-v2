# App Encryption — Apple App Store Connect (paste fields)

**App:** The Outreach Project  
**Bundle ID:** `org.theoutreachproject.torp`  
**Last updated:** June 9, 2026  

Copy the block that matches the **character counter** on your App Store Connect field. Counts below are plain-text length (each character in the paste block counts as 1).

Apple’s public API defines one text attribute, `appDescription`, with **no published maxLength**. The App Store Connect UI may show separate boxes (purpose, encryption description, etc.) with their own counters — use the variant whose **used/limit** matches what you see.

> Have counsel confirm export classification before submission.

Verify counts anytime:

```bash
python docs/legal/verify-encryption-fields.py
```

---

## App purpose

### If your counter shows **300** — use **299/300**

```
The Outreach Project (org.theoutreachproject.torp) helps veterans, first responders, and supporters find nonprofits, trusted resources, community, podcasts, and membership. Capacitor loads https://theoutreachproject.app in WKWebView. Consumer app; not for military or surveillance. No custom crypto.
```

### If your counter shows **500** — use **485/500**

```
The Outreach Project (org.theoutreachproject.torp) is a consumer iOS app for veterans, first responders, and supporters. Users sign in to search nonprofits, browse trusted resources, read community posts, access podcasts, save organizations, and manage optional membership. Capacitor shell loads https://theoutreachproject.app in WKWebView. Not for military, intelligence, or surveillance. Membership billing uses Stripe on the web. Profile and saved orgs sync via Supabase over HTTPS.
```

---

## Description of encryption

### If your counter shows **500** — use **492/500**

```
Encryption is limited to HTTPS (TLS 1.2+) via Apple WebKit/WKWebView and iOS networking. Traffic goes to https://theoutreachproject.app and APIs: WorkOS (sign-in), Supabase (profiles, saved orgs, community), Stripe (membership checkout). No proprietary or non-standard algorithms in the iOS binary. No VPN, E2E chat, encrypted vault, or user keys. Optional photo upload for profile or community images only. Server encryption at rest is provider-managed (Vercel, Supabase), not client crypto.
```

### If your counter shows **1,000** — use **990/1,000**

```
Encryption is limited to HTTPS (TLS 1.2+) through Apple WebKit/WKWebView and iOS networking. All traffic goes to https://theoutreachproject.app and third-party APIs: WorkOS (sign-in), Supabase (profiles, saved orgs, community), Stripe (membership checkout in browser). No proprietary, custom, or non-standard algorithms ship in the iOS binary. No VPN, end-to-end chat, encrypted vault, or user-managed keys. Optional camera or photo access only when the user uploads a profile or community image. Server-side encryption at rest is handled by hosting providers (Vercel, Supabase), not client-side crypto. The Capacitor native shell links only @capacitor/core and @capacitor/share; TLS is provided by Apple OS frameworks. Session cookies use HTTPS secure transport. WorkOS AuthKit handles sign-in over TLS. No local encrypted database beyond iOS defaults. Share sheet uses system APIs only. No certificate pinning beyond the OS trust store. No OpenSSL or custom crypto SDKs in the iOS binary.
```

---

## Exemption / mass-market justification

### If your counter shows **500** — use **497/500**

```
Mass-market consumer resource app distributed on the App Store. Encryption is standard TLS/HTTPS only for authentication, protecting data in transit, and secure API calls to WorkOS, Supabase, and Stripe. Exempt under EAR Category 5 Part 2 mass-market treatment. No CCATS, ERN, or proprietary cryptography. The iOS binary contains no OpenSSL, no custom crypto SDKs, and no encryption beyond what Apple OS and WebKit provide for HTTPS connections to the production web app at theoutreachproject.app.
```

---

## Third-party encryption components

### If your counter shows **250** — use **238/250**

```
WorkOS, Supabase, and Stripe are reached only via HTTPS inside WKWebView. Capacitor bridge and Share plugin only. No bundled third-party crypto libraries; all TLS is provided by Apple OS and WebKit. Vercel hosts the web origin over HTTPS.
```

---

## Single-field `appDescription` (API / one text box)

If App Store Connect shows **one** description field (or you use the App Encryption Declaration API), paste this combined block (**872/4,000**):

```
The Outreach Project (org.theoutreachproject.torp) is a consumer iOS app for veterans, first responders, and supporters (nonprofit directory, trusted resources, community, podcasts, membership). Capacitor/WKWebView loads https://theoutreachproject.app. Encryption: HTTPS (TLS 1.2+) only via Apple WebKit and iOS networking to WorkOS, Supabase, and Stripe. No proprietary, custom, or non-standard crypto in the iOS binary. No VPN, E2E chat, encrypted vault, or user-managed keys. Mass-market consumer app; exempt under EAR Category 5 Part 2. No CCATS, ERN, or proprietary cryptography. Capacitor links @capacitor/core and @capacitor/share only; TLS from Apple OS/WebKit. Not for military, intelligence, or surveillance use. Server encryption at rest is provider-managed (Vercel, Supabase), not client-side crypto. Optional photo upload for profile or community images only.
```

---

## Questionnaire quick answers

| Question | Answer |
|----------|--------|
| Does your app use encryption? | **Yes** (HTTPS/TLS) |
| Exempt from U.S. export documentation (ERN/CCATS)? | **Yes** |
| Category 5, Part 2 exemption? | **Yes** |
| Proprietary / non-standard algorithms? | **No** |
| Encryption beyond auth, signatures, decryption, updates? | **No** |
| Standard encryption in addition to Apple OS encryption? | **Yes** (HTTPS to web APIs) |
| Proprietary cryptography? | **No** |
| Available on French App Store? | **Yes** or **No** (your distribution choice) |

For HTTPS-only Capacitor apps, counsel often recommends skipping documentation upload and setting **`ITSAppUsesNonExemptEncryption`** = **`false`** in Info.plist instead.

---

## Info.plist (after counsel confirms)

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Add `ITSEncryptionExportComplianceCode` only if Apple approves documentation and provides a code.

---

## Reference

- Privacy URL: https://theoutreachproject.app/privacy  
- Support: support@theoutreachproject.app  
- [store-policy-forms.md](../store-policy-forms.md) · [IOS_XCODE_SETUP.md](../IOS_XCODE_SETUP.md)

**Disclaimer:** Internal submission aid only; not legal advice.
