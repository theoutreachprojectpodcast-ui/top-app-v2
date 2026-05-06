/**
 * Per-sponsor visual presentation for public cards (tokens + optional scrim override).
 * Merges with runtime logo tone detection in `FeaturedSponsorCard`.
 */

const DEFAULT = {
  accentColor: "color-mix(in srgb, var(--color-accent) 88%, #ffffff 12%)",
  cardScrimGradient: "",
  locationChips: [],
  veteranOwnedDefault: false,
  logoFallbackUrls: [],
  /** @type {"auto" | "light" | "dark" | "neutral" | "accent"} */
  logoPanelMode: "auto",
};

/** @type {Record<string, Partial<typeof DEFAULT> & { locationChips?: string[] }>} */
const BY_SLUG = {
  "rope-solutions": {
    accentColor: "#6ee7a8",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(6, 10, 14, 0.96) 0%, rgba(14, 18, 24, 0.78) 42%, rgba(8, 12, 18, 0.55) 100%)",
    veteranOwnedDefault: true,
    locationChips: [],
  },
  "rucking-realty-group": {
    accentColor: "#f0c14b",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(18, 12, 8, 0.95) 0%, rgba(28, 20, 12, 0.72) 45%, rgba(14, 10, 8, 0.52) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["San Antonio, TX", "Texas"],
  },
  "eduardo-pico-designs": {
    accentColor: "#7dd3fc",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(10, 12, 20, 0.95) 0%, rgba(16, 18, 28, 0.74) 48%, rgba(10, 12, 18, 0.5) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["Texas"],
  },
  "wars-end-merch": {
    accentColor: "#f472b6",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(16, 10, 12, 0.96) 0%, rgba(24, 14, 16, 0.76) 46%, rgba(12, 8, 10, 0.55) 100%)",
    veteranOwnedDefault: true,
    locationChips: [],
    /* Wordmark is black/dark on transparent; dark circular shell hides it — use a light panel. */
    logoPanelMode: "light",
  },
  "brain-treatment-center-nova": {
    accentColor: "#93c5fd",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(6, 12, 22, 0.96) 0%, rgba(10, 18, 32, 0.78) 50%, rgba(8, 14, 24, 0.52) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["NoVA", "Alexandria", "Ashburn"],
  },
};

/**
 * @param {string} slug
 * @returns {typeof DEFAULT & { locationChips: string[] }}
 */
export function getSponsorCardPresentation(slug) {
  const key = String(slug || "").trim().toLowerCase();
  const row = BY_SLUG[key];
  if (!row) {
    return { ...DEFAULT, locationChips: [], logoFallbackUrls: [] };
  }
  return {
    ...DEFAULT,
    ...row,
    locationChips: Array.isArray(row.locationChips) ? [...row.locationChips] : [],
    logoFallbackUrls: Array.isArray(row.logoFallbackUrls) ? [...row.logoFallbackUrls] : [],
    logoPanelMode: row.logoPanelMode ?? DEFAULT.logoPanelMode,
  };
}
