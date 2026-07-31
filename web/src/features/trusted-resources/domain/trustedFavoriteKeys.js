import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

/**
 * Resolve canonical favorite keys for a trusted resource view model / detail payload.
 * Prefer EIN (Profile → Saved Organizations); fall back to `trusted:{slug}` entity key.
 *
 * @param {Record<string, unknown> | null | undefined} resource
 */
export function resolveTrustedFavoriteKeys(resource) {
  const slug = String(resource?.trustedResourceSlug || "").trim().toLowerCase();
  const ein = normalizeEinDigits(
    resource?.ein || resource?.directoryNonprofitId || resource?.directory_nonprofit_id || "",
  );
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
  return false;
}

/**
 * @param {{
 *   resource: Record<string, unknown>,
 *   isAuthenticated: boolean,
 *   canSave: boolean,
 *   toggleFavoriteEin: (ein: string) => void,
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
    toggleFavoriteEin(ein, resource);
    return { ok: true, mode: "ein", key: ein };
  }
  toggleFavoriteEntityKey(entityKey);
  return { ok: true, mode: "entity", key: entityKey };
}
