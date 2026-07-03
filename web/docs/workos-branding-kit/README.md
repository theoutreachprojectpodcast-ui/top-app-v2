# WorkOS AuthKit branding kit — The Outreach Project

Ready-to-upload assets and copy for [WorkOS AuthKit branding](https://workos.com/docs/authkit/branding). Regenerate assets with:

```bash
cd web && node scripts/generate-workos-branding-kit.mjs
```

## Dashboard location

[WorkOS Dashboard](https://dashboard.workos.com) → **Authentication** → **Branding** (or **AuthKit** → **Branding**)

## Upload assets (`assets/`)

| WorkOS field | File | Requirements met |
|--------------|------|------------------|
| **Logo** | `assets/logo.png` | Wordmark, ≥ 160×160 px, PNG, ≤ 100 KB |
| **Logo icon** | `assets/logo-icon.png` | 1:1 logomark, ≥ 160×160 px, PNG, ≤ 100 KB |
| **Favicon** | `assets/favicon.png` | 1:1, ≥ 32×32 px, PNG, ≤ 100 KB |

After upload, click the logo in the AuthKit preview and choose **logo icon** (mark) for a cleaner mobile header.

## Appearance

| Setting | Value |
|---------|-------|
| Font | **Roboto** |
| Corner radius | **16** px |
| Appearance | System default (or Dark for mobile parity) |

## Colors

| Role | Light | Dark |
|------|-------|------|
| Page background | `#e8ece8` | `#101814` |
| Button background | `#22a52b` | `#22a52b` |
| Button text | `#ffffff` | `#ffffff` |
| Link | `#188a20` | `#9fd4b0` |

## Page settings

| Field | Value |
|-------|-------|
| Privacy policy | `https://theoutreachproject.app/privacy` |
| Terms of service | `https://theoutreachproject.app/terms` |
| Sign-in title | Sign in to The Outreach Project |
| Sign-up title | Create your Outreach Project account |

## Optional — split layout

**Page layout → Split** (sign-in and/or sign-up):

- HTML: paste `split-panel.html`
- CSS: paste `split-panel.css`
- Hide secondary panel on mobile: recommended

## Optional — custom CSS

Paste `custom.css` into **Custom CSS** (applies globally to all AuthKit pages).

## Machine-readable manifest

`manifest.json` lists asset dimensions, byte sizes, and dashboard values (generated with the script above).
