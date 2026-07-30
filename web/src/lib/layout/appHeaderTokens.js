/**
 * Shared app header band tokens (mirrored in CSS on `.topApp` / `.capacitorAppHeaderPortal`).
 * Use these names when reading computed style or documenting clearance formulas.
 */
export const APP_HEADER_HEIGHT_VAR = "--app-header-height";
export const APP_HEADER_TOTAL_HEIGHT_VAR = "--app-header-total-height";
export const SAFE_AREA_TOP_VAR = "--safe-area-top";

/** CSS calc equivalent: offset + floating band + fade (content clearance under fixed chrome). */
export const APP_HEADER_HEIGHT_CALC =
  "calc(var(--header-floating-offset) + var(--header-floating-height) + var(--header-fade-height))";

/** Header band plus top safe-area inset. */
export const APP_HEADER_TOTAL_HEIGHT_CALC =
  "calc(var(--app-header-height) + var(--safe-area-top, env(safe-area-inset-top, 0px)))";
