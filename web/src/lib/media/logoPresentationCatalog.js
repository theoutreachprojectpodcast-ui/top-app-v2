/**
 * Canonical per-entity logo framing for sponsors + trusted resources.
 * Values tuned from production asset analysis (aspect, matte, transparency).
 *
 * @typedef {{
 *   bgColor?: string,
 *   pad?: number,
 *   scale?: number,
 *   fit?: "contain" | "cover",
 *   focusX?: number,
 *   focusY?: number,
 *   panel?: "auto" | "light" | "dark" | "neutral",
 *   borderColor?: string,
 *   minimalFrame?: boolean,
 * }} LogoPresentationEntry
 */

/** @type {Record<string, LogoPresentationEntry>} */
export const LOGO_PRESENTATION_CATALOG = {
  /* ── Sponsors ─────────────────────────────────────────────────────────── */
  "apex-global-outdoors": {
    panel: "light",
    bgColor: "#ffffff",
    pad: 5,
    fit: "contain",
    scale: 1.02,
    minimalFrame: true,
  },
  "gameday-mens-health": {
    panel: "light",
    bgColor: "#ffffff",
    pad: 3,
    fit: "contain",
    scale: 1,
    minimalFrame: true,
  },
  "rope-solutions": {
    panel: "dark",
    bgColor: "#000000",
    pad: 4,
    fit: "contain",
    scale: 1,
    minimalFrame: true,
  },
  "the-veterans-veteran": {
    panel: "dark",
    bgColor: "#0c1420",
    pad: 4,
    fit: "contain",
    scale: 1.04,
    minimalFrame: true,
  },
  "rucking-realty-group": {
    panel: "neutral",
    bgColor: "#f4efe6",
    pad: 4,
    fit: "contain",
    scale: 1,
    minimalFrame: true,
  },
  "iron-soldiers-coffee-company": {
    panel: "neutral",
    bgColor: "#2f3828",
    pad: 0,
    fit: "cover",
    scale: 1.24,
    minimalFrame: true,
  },
  "vetnav-services": {
    panel: "light",
    bgColor: "#ffffff",
    pad: 0,
    fit: "cover",
    scale: 1.14,
    focusX: 50.7,
    focusY: 48.5,
    minimalFrame: true,
  },
  "eduardo-pico-designs": {
    panel: "dark",
    bgColor: "#000000",
    pad: 6,
    fit: "contain",
    scale: 1.06,
    minimalFrame: true,
  },
  "green-gorilla-land-management": {
    panel: "dark",
    bgColor: "#000000",
    pad: 2,
    fit: "contain",
    scale: 1.12,
    minimalFrame: true,
  },

  /* ── Trusted resources ────────────────────────────────────────────────── */
  "say-when-and-remember-him": {
    bgColor: "#f2f2f2",
    pad: 6,
    fit: "contain",
    scale: 1,
  },
  "back-country-heroes": {
    bgColor: "#5c5b56",
    pad: 0,
    fit: "cover",
    scale: 1.12,
  },
  "hero-to-the-line": {
    bgColor: "#ffffff",
    pad: 0,
    fit: "cover",
    scale: 1.34,
    focusX: 50,
    focusY: 47.2,
  },
  "heros-journey-healing-foundation": {
    bgColor: "#1a4d2e",
    pad: 0,
    fit: "cover",
    scale: 1.28,
    focusX: 50.5,
    focusY: 47,
  },
  "freedom-alliance": {
    bgColor: "#000000",
    pad: 0,
    fit: "cover",
    scale: 1.06,
  },
  "southern-outdoor-dreams": {
    bgColor: "#4f4e48",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
  "frontline-healing-foundation": {
    bgColor: "#5c564d",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
  "hometown-hero-outdoors": {
    bgColor: "#4a5d85",
    pad: 0,
    fit: "cover",
    scale: 1.1,
  },
  "veterans-creed-outdoors": {
    bgColor: "#334a58",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
  "warriors-refuge": {
    bgColor: "#8a7b72",
    pad: 7,
    fit: "contain",
    scale: 1.02,
  },
  "hoof-to-heart-veterans": {
    bgColor: "#4c3723",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
  "mos-veteran-adventures": {
    bgColor: "#453c35",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
  "the-fallen-outdoors": {
    bgColor: "#e3dbd6",
    pad: 4,
    fit: "contain",
    scale: 1,
  },
  "sheepdog-impact-assistance": {
    bgColor: "#524c46",
    pad: 0,
    fit: "cover",
    scale: 1.08,
  },
};

/** Slugs that use scenic full-bleed art (runtime fallback when no catalog row). */
export const PHOTO_PLATE_SLUGS = new Set(
  Object.entries(LOGO_PRESENTATION_CATALOG)
    .filter(([, row]) => row.fit === "cover")
    .map(([slug]) => slug),
);

/**
 * @param {string} entityKey
 * @returns {LogoPresentationEntry | null}
 */
export function getCatalogLogoPresentation(entityKey) {
  const key = String(entityKey || "").trim().toLowerCase();
  if (!key) return null;
  const row = LOGO_PRESENTATION_CATALOG[key];
  return row ? { ...row } : null;
}

/**
 * @param {string} slug
 * @returns {"auto" | "light" | "dark" | "neutral"}
 */
export function getCatalogLogoPanelMode(slug) {
  const row = getCatalogLogoPresentation(slug);
  return row?.panel || "auto";
}
