# WorkOS AuthKit branding — The Outreach Project

**Branding kit (upload-ready assets + dashboard values):** [`workos-branding-kit/`](./workos-branding-kit/README.md) — regenerate with `node scripts/generate-workos-branding-kit.mjs` from `web/`.

AuthKit’s **hosted** sign-in UI (Google, email, password, MFA, etc.) is styled in the **WorkOS Dashboard**, not in this repo. Our app already brands every **same-origin** step (redirect bridge, callback errors, mobile OAuth return).

## 1. WorkOS Dashboard (hosted AuthKit pages)

1. Open [WorkOS Dashboard](https://dashboard.workos.com) → **Authentication** → **Branding** (or **AuthKit** → **Branding**).
2. Upload assets (≤ 100 KB each):

| Asset | File in repo | Notes |
|-------|----------------|-------|
| **Logo** (wordmark) | `web/public/brand-logo-site-dark.png` | Resize/compress if over 100 KB |
| **Logo icon** (mark) | `web/public/brand-app-icon-master.png` or `icon-512.png` | 1:1, ≥ 160×160; compress for dashboard limit |
| **Favicon** | `web/public/apple-touch-icon.png` | 180×180, already small |

3. In the AuthKit preview, click the logo area to choose **mark vs full wordmark** (mark recommended on mobile).

### Colors (match `web/src/styles/brand-theme.css`)

| Role | Light mode | Dark mode |
|------|------------|-----------|
| Page background | `#e8ece8` | `#101814` |
| Button background | `#22a52b` | `#22a52b` |
| Button text | `#ffffff` | `#ffffff` |
| Link color | `#188a20` | `#9fd4b0` |

**Font:** **Roboto** (same as the web app).

**Corner radius:** `16px` (aligned with app cards).

**Appearance:** System default, or enforce dark if you prefer consistency with mobile splash.

### Page settings

- **Privacy policy:** `https://theoutreachproject.app/privacy`
- **Terms of service:** `https://theoutreachproject.app/terms`
- **Page title copy:** e.g. “Sign in to The Outreach Project” / “Create your account”

### Optional — split layout (marketing column)

Under **Page layout → Split**, add HTML for the secondary panel:

```html
<h2>Veterans, sponsors, and community</h2>
<p>One network for trusted resources, membership, and outreach.</p>
```

Example CSS:

```css
h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: light-dark(#111714, #f8fcfa);
}
p {
  margin: 0;
  line-height: 1.5;
  color: light-dark(#4f5d55, rgba(232, 238, 246, 0.82));
}
```

### Optional — custom CSS (subtle green glow)

```css
.ak-Background {
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(34, 165, 43, 0.14), transparent 58%),
    light-dark(linear-gradient(168deg, #eef3ef, #e8ece8), linear-gradient(168deg, #1a241c, #101814));
}
```

See [WorkOS AuthKit branding docs](https://workos.com/docs/authkit/branding).

## 2. App-owned pages (this repo)

These use shared branding via `web/src/lib/auth/workosAuthBrand.js` and `WorkOSAuthShell`:

| Step | Where |
|------|--------|
| PKCE redirect bridge | `/auth/workos-handoff`, `/auth/workos-go` |
| OAuth callback errors | `/callback` |
| Mobile in-app browser return | `mobileOAuthBrowserDoneHtml` |
| Sign-in / sign-up handoff | `/sign-in`, `/login`, `/mobile/sign-in` |

Deploy to production after changes; no new TestFlight build required for HTML/React branding.

## 3. Verify

1. Incognito browser → `https://theoutreachproject.app/sign-in` → branded bridge → **branded AuthKit**.
2. Mobile app → Sign in → in-app browser shows branded AuthKit + branded “Returning to app” page.
3. Force an error (cancel OAuth) → branded error card with OP mark and green actions.
