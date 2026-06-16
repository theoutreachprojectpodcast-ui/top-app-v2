/**
 * Curated per-entity logo framing — merged over runtime image analysis.
 * Keys: sponsor slug, trusted resource slug, or nonprofit EIN.
 *
 * @typedef {{
 *   bgColor?: string,
 *   pad?: number,
 *   scale?: number,
 *   panel?: "auto" | "light" | "dark" | "neutral",
 *   borderColor?: string,
 * }} LogoPresentationOverride
 */

/** @type {Record<string, LogoPresentationOverride>} */
const BY_KEY = {
  "apex-global-outdoors": { panel: "neutral", bgColor: "#0b0f0d", pad: 4, scale: 1.04 },
  "rope-solutions": { panel: "dark", bgColor: "#000000", pad: 5 },
  "eduardo-pico-designs": { panel: "dark", bgColor: "#000000", pad: 6 },
  "the-veterans-veteran": { panel: "dark", bgColor: "#0a1628", pad: 7 },
  "gameday-mens-health": { panel: "light", bgColor: "#ffffff", pad: 5, scale: 1.04 },
  "vetnav-services": { panel: "light", bgColor: "#ffffff", pad: 7 },
  "green-gorilla-land-management": { panel: "dark", bgColor: "#000000", pad: 4, scale: 1.06 },
  "rucking-realty-group": { panel: "dark", bgColor: "#1a1208", pad: 7 },

  "back-country-heroes": { bgColor: "#0a100e", pad: 6 },
  "hero-to-the-line": { bgColor: "#101820", pad: 7 },
  "warriors-refuge": { bgColor: "#1a2332", pad: 8 },
  "say-when-and-remember-him": { bgColor: "#0f1418", pad: 8 },
};

/**
 * @param {string} entityKey
 * @returns {LogoPresentationOverride | null}
 */
export function getLogoPresentationOverride(entityKey) {
  const key = String(entityKey || "").trim().toLowerCase();
  if (!key) return null;
  const row = BY_KEY[key];
  return row ? { ...row } : null;
}

/**
 * @param {LogoPresentationOverride | null | undefined} manual
 * @param {import("./assessLogoPresentation.js").ReturnType<typeof import("./assessLogoPresentation.js").assessLogoPresentationFromElement>} assessed
 * @param {{ panel?: string, surface?: string }} context
 */
export function mergeLogoPresentation(manual, assessed, context = {}) {
  const panel =
    context.panel && context.panel !== "auto"
      ? context.panel
      : manual?.panel && manual.panel !== "auto"
        ? manual.panel
        : "auto";
  let bgColor = assessed.bgColor;
  let pad = assessed.pad;
  let scale = assessed.scale || 1;

  if (manual?.bgColor) bgColor = manual.bgColor;
  if (manual?.pad != null) pad = manual.pad;
  if (manual?.scale != null) scale = manual.scale;

  if (panel === "light") bgColor = manual?.bgColor || "#f8fafc";
  if (panel === "dark") bgColor = manual?.bgColor || "#0a0a0a";

  return {
    bgColor,
    pad,
    scale,
    tone: assessed.tone || "normal",
    borderColor: manual?.borderColor || "",
    panel,
  };
}
