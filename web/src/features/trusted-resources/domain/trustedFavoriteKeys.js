import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  TRUSTED_RESOURCE_BY_SLUG,
  normalizeTrustedResourceEin,
} from "@/features/trusted-resources/trustedResourcesRegistry";

const TRUSTED_SLUG_ALIASES = {
  "m-o-s-veteran-adventures": "mos-veteran-adventures",
  "the-warriors-refuge": "warriors-refuge",
};

/**
 * Resolve canonical favorite keys for a trusted resource view model / detail payload.
 * Prefer EIN (Profile → Saved Organizations); fall back to `trusted:{slug}` entity key.
 *
 * @param {Record<string, unknown> | null | undefined} resource
 */
export function resolveTrustedFavoriteKeys(resource) {
  const slug = String(resource?.trustedResourceSlug || "").trim().toLowerCase();
  let ein = normalizeEinDigits(
    resource?.ein || resource?.directoryNonprofitId || resource?.directory_nonprofit_id || "",
  );
  if (ein.length !== 9 && slug) {
    const alias = TRUSTED_SLUG_ALIASES[slug] || slug;
    const record = TRUSTED_RESOURCE_BY_SLUG[alias] || TRUSTED_RESOURCE_BY_SLUG[slug];
    ein = normalizeTrustedResourceEin(record?.eins?.[0] || "");
  }
  const hasEin = ein.length === 9;
  const entityKey = slug ? `trusted:${slug}` : "";
  return {
    ein: hasEin ? ein : "",
    hasEin,
    entityKey,
    /** Prefer EIN as toggle payload when present; otherwise entity key. */
    toggleKey: hasEin ? ein : entityKey,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} resource
 * @param {string[]} favoriteEins
 * @param {string[]} favoriteEntityKeys
 */
export function isTrustedResourceFavorited(resource, favoriteEins = [], favoriteEntityKeys = []) {
  const { ein, hasEin, entityKey } = resolveTrustedFavoriteKeys(resource);
  if (hasEin && (favoriteEins || []).includes(ein)) return true;
  if (entityKey && (favoriteEntityKeys || []).includes(entityKey)) return true;
  // Legacy slug aliases
  if (entityKey) {
    const slug = entityKey.replace(/^trusted:/, "");
    const alias = TRUSTED_SLUG_ALIASES[slug];
    if (alias && (favoriteEntityKeys || []).includes(`trusted:${alias}`)) return true;
    const reverse = Object.entries(TRUSTED_SLUG_ALIASES).find(([, v]) => v === slug)?.[0];
    if (reverse && (favoriteEntityKeys || []).includes(`trusted:${reverse}`)) return true;
  }
  return false;
}

/**
 * @param {{
 *   resource: Record<string, unknown>,
 *   isAuthenticated: boolean,
 *   canSave: boolean,
 *   toggleFavoriteEin: (ein: string, sourceRow?: Record<string, unknown>) => void,
 *   toggleFavoriteEntityKey: (key: string) => void,
 *   onRequestSignIn?: () => void,
 * }} args
 */
export function toggleTrustedResourceFavorite({
  resource,
  isAuthenticated,
  canSave,
  toggleFavoriteEin,
  toggleFavoriteEntityKey,
  onRequestSignIn,
}) {
  const { hasEin, ein, entityKey } = resolveTrustedFavoriteKeys(resource);
  if (!hasEin && !entityKey) return { ok: false, reason: "missing_key" };
  if (!isAuthenticated) {
    onRequestSignIn?.();
    return { ok: false, reason: "auth_required" };
  }
  if (!canSave) return { ok: false, reason: "membership_required" };
  if (hasEin) {
    const aliasSlug = String(resource?.trustedResourceSlug || "").trim().toLowerCase();
    const record =
      TRUSTED_RESOURCE_BY_SLUG[TRUSTED_SLUG_ALIASES[aliasSlug] || aliasSlug] ||
      TRUSTED_RESOURCE_BY_SLUG[aliasSlug];
    toggleFavoriteEin(ein, {
      ...resource,
      ein,
      name: resource?.name || record?.displayName || "",
      orgName: resource?.orgName || resource?.name || record?.displayName || "",
    });
    return { ok: true, mode: "ein", key: ein };
  }
  toggleFavoriteEntityKey(entityKey);
  return { ok: true, mode: "entity", key: entityKey };
}
