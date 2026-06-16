/**
 * Per-sponsor visual presentation for public cards (tokens + optional scrim override).
 * Merges with runtime logo tone detection in `FeaturedSponsorCard`.
 */

import {
  APEX_GLOBAL_OUTDOORS_LOGO_URL,
  EDUARDO_PICO_DESIGNS_LOGO_URL,
  GAMEDAY_MENS_HEALTH_LOGO_URL,
  GREEN_GORILLA_LAND_MANAGEMENT_LOGO_URL,
  IRON_SOLDIERS_COFFEE_LOGO_URL,
  ROPE_SOLUTIONS_LOGO_URL,
  RUCKING_REALTY_GROUP_LOGO_URL,
  THE_VETERANS_VETERAN_LOGO_URL,
  VET_NAV_SERVICES_LOGO_URL,
} from "@/features/sponsors/data/featuredSponsors";
import { PODCAST_SPONSOR_SEED_SLUG_ALIASES } from "@/features/sponsors/api/sponsorCatalogApi";
import { getCatalogLogoPanelMode } from "@/lib/media/logoPresentationCatalog";

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
  "apex-global-outdoors": {
    accentColor: "#f59e0b",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(14, 10, 8, 0.94) 0%, rgba(22, 14, 8, 0.76) 46%, rgba(12, 8, 6, 0.52) 100%)",
    veteranOwnedDefault: false,
    locationChips: [],
    /* Circular wordmark PNG (transparent outside disc); hero art is separate. */
    logoPanelMode: "light",
    logoFallbackUrls: [APEX_GLOBAL_OUTDOORS_LOGO_URL],
  },
  "rope-solutions": {
    accentColor: "#6ee7a8",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(6, 10, 14, 0.96) 0%, rgba(14, 18, 24, 0.78) 42%, rgba(8, 12, 18, 0.55) 100%)",
    veteranOwnedDefault: true,
    locationChips: [],
    /* Circular mark on black — keep dark logo shell (no auto swap to light panel). */
    logoPanelMode: "dark",
    logoFallbackUrls: [ROPE_SOLUTIONS_LOGO_URL],
  },
  "rucking-realty-group": {
    accentColor: "#f0c14b",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(18, 12, 8, 0.95) 0%, rgba(28, 20, 12, 0.72) 45%, rgba(14, 10, 8, 0.52) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["San Antonio, TX", "Texas"],
    logoPanelMode: "dark",
    logoFallbackUrls: [RUCKING_REALTY_GROUP_LOGO_URL],
  },
  "eduardo-pico-designs": {
    accentColor: "#7dd3fc",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(10, 12, 20, 0.95) 0%, rgba(16, 18, 28, 0.74) 48%, rgba(10, 12, 18, 0.5) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["Texas"],
    /* Official mark is gold on black; keep default dark logo shell (no auto tone swap to light panel). */
    logoPanelMode: "dark",
    logoFallbackUrls: [EDUARDO_PICO_DESIGNS_LOGO_URL],
  },
  "the-veterans-veteran": {
    accentColor: "#60a5fa",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(8, 12, 20, 0.96) 0%, rgba(14, 18, 28, 0.78) 46%, rgba(8, 10, 18, 0.55) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["U.S.", "VA claims support"],
    logoPanelMode: "dark",
    logoFallbackUrls: [THE_VETERANS_VETERAN_LOGO_URL],
  },
  "gameday-mens-health": {
    accentColor: "#f87171",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(14, 8, 8, 0.96) 0%, rgba(22, 10, 10, 0.76) 48%, rgba(12, 6, 6, 0.52) 100%)",
    veteranOwnedDefault: false,
    locationChips: ["U.S. & Canada", "400+ clinics"],
    logoPanelMode: "light",
    logoFallbackUrls: [GAMEDAY_MENS_HEALTH_LOGO_URL],
  },
  "iron-soldiers-coffee-company": {
    accentColor: "#d97706",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(14, 12, 8, 0.95) 0%, rgba(22, 18, 12, 0.74) 46%, rgba(12, 10, 8, 0.52) 100%)",
    veteranOwnedDefault: true,
    locationChips: [],
    logoPanelMode: "neutral",
    logoFallbackUrls: [IRON_SOLDIERS_COFFEE_LOGO_URL],
  },
  "wars-end-merch": {
    accentColor: "#94a3b8",
    veteranOwnedDefault: false,
    locationChips: [],
    logoPanelMode: "dark",
    logoFallbackUrls: [
      "https://images.squarespace-cdn.com/content/v1/6959573fd567e738e7c613f3/cfd220a6-7daf-4845-8d83-fdb8c2ffa128/ChatGPT+Image+Jan+7%2C+2026%2C+08_37_51+PM.png?format=2500w",
    ],
  },
  "vetnav-services": {
    accentColor: "#f59e0b",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(14, 12, 8, 0.95) 0%, rgba(22, 18, 12, 0.74) 46%, rgba(12, 10, 8, 0.52) 100%)",
    veteranOwnedDefault: true,
    locationChips: [],
    /* Official mark is black linework on white — light logo shell preserves edge clarity on the hero strip. */
    logoPanelMode: "light",
    logoFallbackUrls: [VET_NAV_SERVICES_LOGO_URL],
  },
  "green-gorilla-land-management": {
    accentColor: "#4ade80",
    cardScrimGradient:
      "linear-gradient(118deg, rgba(8, 14, 10, 0.96) 0%, rgba(12, 20, 14, 0.78) 44%, rgba(8, 12, 10, 0.55) 100%)",
    veteranOwnedDefault: true,
    locationChips: ["Charleston, SC", "Lowcountry"],
    /* Official mark is white stencil on black art — dark logo shell (not panel-light). */
    logoPanelMode: "dark",
    logoFallbackUrls: [GREEN_GORILLA_LAND_MANAGEMENT_LOGO_URL],
  },
};

/**
 * @param {string} slug
 * @returns {typeof DEFAULT & { locationChips: string[] }}
 */
export function getSponsorCardPresentation(slug) {
  const raw = String(slug || "").trim().toLowerCase();
  const key = PODCAST_SPONSOR_SEED_SLUG_ALIASES[raw] || raw;
  const row = BY_SLUG[key];
  if (!row) {
    return {
      ...DEFAULT,
      locationChips: [],
      logoFallbackUrls: [],
      logoPanelMode: getCatalogLogoPanelMode(key) || DEFAULT.logoPanelMode,
    };
  }
  return {
    ...DEFAULT,
    ...row,
    locationChips: Array.isArray(row.locationChips) ? [...row.locationChips] : [],
    logoFallbackUrls: Array.isArray(row.logoFallbackUrls) ? [...row.logoFallbackUrls] : [],
    logoPanelMode: row.logoPanelMode ?? getCatalogLogoPanelMode(key) ?? DEFAULT.logoPanelMode,
  };
}
