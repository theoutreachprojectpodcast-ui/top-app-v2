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
 *   frameShape?: "circle" | "rounded",
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
    pad: 5,
    fit: "contain",
    scale: 1,
    focusX: 50,
    focusY: 50,
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
    panel: "light",
    bgColor: "#ffffff",
    pad: 0,
    fit: "cover",
    scale: 1.02,
    focusX: 50,
    focusY: 42,
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
  "don-blas-cigars": {
    panel: "dark",
    bgColor: "#0a0a0a",
    pad: 0,
    fit: "contain",
    scale: 1.1,
    focusX: 50,
    focusY: 50,
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
    panel: "light",
    bgColor: "#ffffff",
    pad: 0,
    fit: "contain",
    scale: 1.13,
    focusX: 50,
    focusY: 47,
    minimalFrame: true,
  },
  "heros-journey-healing-foundation": {
    panel: "dark",
    bgColor: "#1a4d2e",
    pad: 10,
    fit: "contain",
    scale: 0.94,
    focusX: 50,
    focusY: 50,
    minimalFrame: true,
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
    panel: "neutral",
    bgColor: "#8a7a6b",
    pad: 0,
    fit: "contain",
    scale: 0.97,
    focusX: 50,
    focusY: 52,
    minimalFrame: true,
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
    panel: "light",
    bgColor: "#f4f4f2",
    pad: 6,
    fit: "contain",
    scale: 1,
    focusX: 50,
    focusY: 40,
    minimalFrame: true,
  },
  "the-rivetin-rosies-project": {
    panel: "light",
    bgColor: "#ffd400",
    pad: 4,
    fit: "contain",
    scale: 1,
    focusX: 50,
    focusY: 50,
    minimalFrame: true,
  },
  "changed-by-nature-outdoors": {
    panel: "light",
    bgColor: "#f4f1ea",
    pad: 3,
    fit: "contain",
    scale: 1,
    focusX: 50,
    focusY: 50,
    minimalFrame: true,
  },
  "shepherds-light-foundation": {
    panel: "dark",
    bgColor: "#0b245b",
    pad: 6,
    fit: "contain",
    scale: 1,
    focusX: 50,
    focusY: 48,
    minimalFrame: true,
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
