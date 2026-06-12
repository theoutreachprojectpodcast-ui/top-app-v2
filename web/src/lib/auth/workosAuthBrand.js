/**
 * Shared Outreach Project branding for WorkOS auth handoff HTML and dashboard setup docs.
 */

/** @returns {string} */
export function workosAuthPublicOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (fromEnv.startsWith("http")) return fromEnv.replace(/\/$/, "");
  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "https://theoutreachproject.app";
}

/** Brand tokens aligned with `brand-theme.css` and mobile splash. */
export const WORKOS_AUTH_BRAND = {
  name: "The Outreach Project",
  shortName: "TOP",
  fontFamily: 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  markPath: "/brand-logo-mark-dark.png",
  fullLogoPath: "/brand-logo-site-dark.png",
  faviconPath: "/apple-touch-icon.png",
  colors: {
    pageBg: "#101814",
    pageBgLight: "#e8ece8",
    cardBg: "#1a2420",
    cardBgLight: "#ffffff",
    border: "#3a4a40",
    borderLight: "#d6ddd8",
    text: "#f8fcfa",
    textLight: "#111714",
    textMuted: "rgba(232, 238, 246, 0.82)",
    accent: "#22a52b",
    accentHover: "#188a20",
    onAccent: "#ffffff",
    link: "#9fd4b0",
    linkLight: "#188a20",
    warn: "#f5d76e",
    softBtnBg: "#2a3530",
  },
};

/** @param {string} [assetPath] */
export function workosAuthBrandAssetUrl(assetPath = WORKOS_AUTH_BRAND.markPath) {
  const path = String(assetPath || "").trim();
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${workosAuthPublicOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Inline CSS for standalone auth HTML responses (no Next bundle). */
export function workosAuthBrandedPageCss() {
  const c = WORKOS_AUTH_BRAND.colors;
  return `
    :root {
      color-scheme: dark;
      --torp-page: ${c.pageBg};
      --torp-card: ${c.cardBg};
      --torp-border: ${c.border};
      --torp-text: ${c.text};
      --torp-muted: ${c.textMuted};
      --torp-accent: ${c.accent};
      --torp-accent-hover: ${c.accentHover};
      --torp-on-accent: ${c.onAccent};
      --torp-link: ${c.link};
      --torp-warn: ${c.warn};
      --torp-soft: ${c.softBtnBg};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      min-height: 100dvh;
      font-family: ${WORKOS_AUTH_BRAND.fontFamily};
      background:
        radial-gradient(120% 80% at 50% 0%, rgba(34, 165, 43, 0.16), transparent 58%),
        linear-gradient(168deg, #1a241c 0%, var(--torp-page) 42%, var(--torp-page) 100%);
      color: var(--torp-text);
    }
    .torpAuth {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
        max(24px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
    }
    .torpAuth__card {
      width: 100%;
      max-width: 22rem;
      padding: clamp(18px, 4vw, 24px);
      border-radius: 16px;
      background: color-mix(in srgb, var(--torp-card) 92%, transparent);
      border: 1px solid var(--torp-border);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
      text-align: center;
    }
    .torpAuth__brand {
      margin: 0 auto 16px;
      max-width: min(72vw, 200px);
    }
    .torpAuth__brand img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 72px;
      object-fit: contain;
    }
    .torpAuth__title {
      margin: 0 0 8px;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .torpAuth__lead {
      margin: 0 0 16px;
      line-height: 1.45;
      font-size: 0.95rem;
      color: var(--torp-muted);
    }
    .torpAuth__lead--warn {
      color: var(--torp-warn);
    }
    .torpAuth__spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 14px;
      border: 3px solid rgba(34, 165, 43, 0.22);
      border-top-color: var(--torp-accent);
      border-radius: 50%;
      animation: torpSpin 0.85s linear infinite;
    }
    @keyframes torpSpin { to { transform: rotate(360deg); } }
    .torpAuth__actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .torpAuth__btn {
      display: block;
      padding: 12px 20px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      border: none;
      cursor: pointer;
    }
    .torpAuth__btn--primary {
      background: var(--torp-accent);
      color: var(--torp-on-accent);
    }
    .torpAuth__btn--primary:hover { background: var(--torp-accent-hover); }
    .torpAuth__btn--soft {
      background: var(--torp-soft);
      color: var(--torp-text);
      border: 1px solid var(--torp-border);
    }
    .torpAuth__link {
      color: var(--torp-link);
      font-weight: 600;
      text-decoration: none;
    }
    .torpAuth__link:hover { text-decoration: underline; }
  `.trim();
}

/**
 * @param {{
 *   title?: string,
 *   heading?: string,
 *   bodyHtml?: string,
 *   showLogo?: boolean,
 *   showSpinner?: boolean,
 *   headExtra?: string,
 *   bodyEnd?: string,
 * }} options
 */
export function workosAuthBrandedHtmlPage({
  title = "The Outreach Project",
  heading = WORKOS_AUTH_BRAND.name,
  bodyHtml = "",
  showLogo = true,
  showSpinner = false,
  headExtra = "",
  bodyEnd = "",
} = {}) {
  const safeTitle = String(title).replace(/</g, "&lt;");
  const safeHeading = String(heading).replace(/</g, "&lt;");
  const logoUrl = workosAuthBrandAssetUrl(WORKOS_AUTH_BRAND.markPath).replace(/"/g, "&quot;");
  const logoBlock = showLogo
    ? `<div class="torpAuth__brand" aria-hidden="true"><img src="${logoUrl}" alt="" /></div>`
    : "";
  const spinnerBlock = showSpinner ? `<div class="torpAuth__spinner" aria-hidden="true"></div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${WORKOS_AUTH_BRAND.colors.pageBg}" />
  <title>${safeTitle}</title>
  <link rel="icon" href="${workosAuthBrandAssetUrl(WORKOS_AUTH_BRAND.faviconPath).replace(/"/g, "&quot;")}" />
  <style>${workosAuthBrandedPageCss()}</style>
  ${headExtra}
</head>
<body>
  <main class="torpAuth" role="main">
    <div class="torpAuth__card">
      ${logoBlock}
      ${spinnerBlock}
      <h1 class="torpAuth__title">${safeHeading}</h1>
      ${bodyHtml}
    </div>
  </main>
  ${bodyEnd}
</body>
</html>`;
}
