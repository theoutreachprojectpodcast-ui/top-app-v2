/**
 * Curated per-entity logo framing — merged over runtime image analysis.
 *
 * @typedef {{
 *   bgColor?: string,
 *   pad?: number,
 *   scale?: number,
 *   fit?: "contain" | "cover",
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

  /* Photo-backed trusted marks — crop scenic plates, keep badge centered in circle */
  "back-country-heroes": { bgColor: "#141a16", pad: 0, fit: "cover", scale: 1.1 },
  "hero-to-the-line": { bgColor: "#101820", pad: 0, fit: "cover", scale: 1.08 },
  "warriors-refuge": { bgColor: "#1a2332", pad: 0, fit: "cover", scale: 1.06 },
  "say-when-and-remember-him": { bgColor: "#0f1418", pad: 0, fit: "cover", scale: 1.06 },
  "heros-journey-healing-foundation": { bgColor: "#121820", pad: 0, fit: "cover", scale: 1.06 },
  "freedom-alliance": { bgColor: "#0e1420", pad: 0, fit: "cover", scale: 1.06 },
  "southern-outdoor-dreams": { bgColor: "#121a14", pad: 0, fit: "cover", scale: 1.06 },
  "frontline-healing-foundation": { bgColor: "#101418", pad: 0, fit: "cover", scale: 1.06 },
  "hometown-hero-outdoors": { bgColor: "#141810", pad: 0, fit: "cover", scale: 1.06 },
  "veterans-creed-outdoors": { bgColor: "#101620", pad: 0, fit: "cover", scale: 1.06 },
  "hoof-to-heart-veterans": { bgColor: "#141610", pad: 0, fit: "cover", scale: 1.06 },
  "mos-veteran-adventures": { bgColor: "#121820", pad: 0, fit: "cover", scale: 1.06 },
  "the-fallen-outdoors": { bgColor: "#101418", pad: 0, fit: "cover", scale: 1.06 },
  "sheepdog-impact-assistance": { bgColor: "#101820", pad: 0, fit: "cover", scale: 1.06 },
};

/** @type {{ test: RegExp, override: LogoPresentationOverride }[]} */
const BY_SRC = [{ test: /back-country-heroes-org-logo/i, override: BY_KEY["back-country-heroes"] }];

/**
 * @param {string} entityKey
 * @param {string} [src]
 * @returns {LogoPresentationOverride | null}
 */
export function getLogoPresentationOverride(entityKey, src = "") {
  const key = String(entityKey || "").trim().toLowerCase();
  if (key && BY_KEY[key]) return { ...BY_KEY[key] };

  const url = String(src || "").trim();
  if (url) {
    for (const row of BY_SRC) {
      if (row.test.test(url)) return { ...row.override };
    }
  }

  return null;
}

/**
 * @param {LogoPresentationOverride | null | undefined} manual
 * @param {object} assessed
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
  let fit = assessed.fit || "contain";

  if (manual?.bgColor) bgColor = manual.bgColor;
  if (manual?.pad != null) pad = manual.pad;
  if (manual?.scale != null) scale = manual.scale;
  if (manual?.fit) fit = manual.fit;

  if (panel === "light") bgColor = manual?.bgColor || "#f8fafc";
  if (panel === "dark") bgColor = manual?.bgColor || "#0a0a0a";
  if (fit === "cover" && pad == null) pad = 0;

  return {
    bgColor,
    pad: pad ?? 8,
    scale,
    fit,
    tone: assessed.tone || "normal",
    borderColor: manual?.borderColor || "",
    panel,
  };
}
