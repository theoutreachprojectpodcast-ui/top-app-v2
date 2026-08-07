/**
 * Server-authoritative saved-organizations service.
 *
 * Architecture (Option B — typed saved-entity relationship):
 * - Directory + EIN-backed trusted resources → `top_app_saved_org_eins`
 *   keyed by WorkOS `user_id` + 9-digit EIN (canonical org id).
 * - Trusted resources without a resolvable EIN → profile metadata
 *   `favoriteEntityKeys` as `trusted:{slug}`.
 *
 * Canonical user id: WorkOS user id (`auth.user.id` / `top_profiles.workos_user_id`).
 * Canonical org id: IRS EIN (9 digits) when available; else trusted slug entity key.
 */
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  nonprofitExistsForSave,
  resolveSavedOrganizationDirectoryRows,
} from "@/lib/savedOrganizations/resolveSavedOrganizations";
import { getProfileRowByWorkOSId, mergeProfileMetadataByWorkOSId } from "@/lib/profile/serverProfile";
import {
  TRUSTED_RESOURCE_BY_SLUG,
  TRUSTED_RESOURCE_CANONICAL_RECORDS,
  normalizeTrustedResourceEin,
} from "@/features/trusted-resources/trustedResourcesRegistry";

export const SAVED_ORG_TABLE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SAVED_ORG_TABLE) || "top_app_saved_org_eins";

export const SAVED_ORG_ERRORS = Object.freeze({
  AUTH_REQUIRED: "authentication_required",
  PROFILE_LINK_MISSING: "profile_link_missing",
  ORGANIZATION_NOT_FOUND: "organization_not_found",
  UNSUPPORTED_TYPE: "unsupported_organization_type",
  SAVE_FORBIDDEN: "save_forbidden",
  DUPLICATE_RESOLVED: "duplicate_save_resolved",
  DATABASE_WRITE_FAILED: "database_write_failed",
  SAVED_STATE_UNAVAILABLE: "saved_state_unavailable",
  PROFILE_LIST_UNAVAILABLE: "profile_list_unavailable",
  INVALID_EIN: "invalid_ein",
  INVALID_ACTION: "invalid_action",
});

export function logSavedOrgEvent(event, fields = {}) {
  console.info(
    JSON.stringify({
      scope: "saved_orgs",
      event,
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}

export function normalizeTrustedEntityKey(raw) {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return "";
  if (!/^[a-z0-9:_-]+$/.test(text)) return "";
  if (text.startsWith("trusted:")) return text.slice(0, 180);
  return "";
}

export function orderUniqueEins(eins = []) {
  return [...new Set((eins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
}

/**
 * Map trusted registry slug → EIN when the curated registry has one.
 * Also accepts common legacy slug aliases.
 */
const TRUSTED_SLUG_ALIASES = Object.freeze({
  "m-o-s-veteran-adventures": "mos-veteran-adventures",
  "the-warriors-refuge": "warriors-refuge",
  "warriors-refuge": "warriors-refuge",
});

export function resolveTrustedSlugToEin(slugRaw) {
  const raw = String(slugRaw || "")
    .trim()
    .toLowerCase()
    .replace(/^trusted:/, "");
  if (!raw) return "";
  const slug = TRUSTED_SLUG_ALIASES[raw] || raw;
  const record = TRUSTED_RESOURCE_BY_SLUG[slug];
  if (!record) return "";
  const ein = normalizeTrustedResourceEin(record.eins?.[0] || "");
  return ein.length === 9 ? ein : "";
}

export function trustedRegistryEinSet() {
  const set = new Set();
  for (const rec of TRUSTED_RESOURCE_CANONICAL_RECORDS || []) {
    for (const raw of rec.eins || []) {
      const ein = normalizeTrustedResourceEin(raw);
      if (ein.length === 9) set.add(ein);
    }
  }
  return set;
}

export function listTrustedEntityKeysFromProfileRow(row) {
  const meta = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  const raw = Array.isArray(meta.favoriteEntityKeys) ? meta.favoriteEntityKeys : [];
  return [...new Set(raw.map(normalizeTrustedEntityKey).filter(Boolean))];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} workosUserId
 */
export async function listSavedEinsForUser(admin, workosUserId) {
  if (!admin || !workosUserId) {
    return { ok: false, error: { message: "missing_admin_or_user" }, eins: [] };
  }
  const { data, error } = await admin
    .from(SAVED_ORG_TABLE)
    .select("ein,sort_order,created_at")
    .eq("user_id", workosUserId)
    .order("sort_order", { ascending: true });
  if (error) return { ok: false, error, eins: [] };
  return { ok: true, eins: orderUniqueEins((data || []).map((r) => r.ein)), rows: data || [] };
}

/**
 * Confirm an organization is saveable from any product surface.
 * Includes curated trusted registry EINs so UI/registry never diverge from save validation.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} einRaw
 * @param {{ allowAlreadySavedForUserId?: string }} [opts]
 */
export async function organizationExistsForSave(admin, einRaw, opts = {}) {
  const ein = normalizeEinDigits(einRaw);
  if (ein.length !== 9 || !admin) return false;

  if (trustedRegistryEinSet().has(ein)) return true;

  if (opts.allowAlreadySavedForUserId) {
    const { data } = await admin
      .from(SAVED_ORG_TABLE)
      .select("ein")
      .eq("user_id", opts.allowAlreadySavedForUserId)
      .eq("ein", ein)
      .maybeSingle();
    if (data?.ein) return true;
  }

  return nonprofitExistsForSave(admin, ein);
}

/**
 * Idempotent save of a directory / EIN-backed organization.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   workosUserId: string,
 *   profileId?: string | null,
 *   ein: string,
 *   correlationId?: string,
 *   mutationId?: string,
 * }} args
 */
export async function saveOrganizationByEin(admin, args) {
  const { workosUserId, profileId = null, correlationId = null, mutationId = null } = args;
  const ein = normalizeEinDigits(args.ein);
  if (ein.length !== 9) {
    return { ok: false, code: SAVED_ORG_ERRORS.INVALID_EIN, status: 400, message: "A valid 9-digit EIN is required." };
  }

  const exists = await organizationExistsForSave(admin, ein, { allowAlreadySavedForUserId: workosUserId });
  if (!exists) {
    logSavedOrgEvent("toggle_save_rejected", {
      correlationId,
      mutationId,
      workosUserId,
      profileId,
      organizationId: ein,
      entityType: "nonprofit_ein",
      action: "save",
      code: SAVED_ORG_ERRORS.ORGANIZATION_NOT_FOUND,
    });
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.ORGANIZATION_NOT_FOUND,
      status: 400,
      message: "This organization could not be saved because it is not in the directory.",
      rejectedEins: [ein],
    };
  }

  const listedBefore = await listSavedEinsForUser(admin, workosUserId);
  if (listedBefore.ok && listedBefore.eins.includes(ein)) {
    const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, [ein]);
    logSavedOrgEvent("toggle_save_idempotent", {
      correlationId,
      mutationId,
      workosUserId,
      profileId,
      organizationId: ein,
      entityType: "nonprofit_ein",
      action: "save",
      code: SAVED_ORG_ERRORS.DUPLICATE_RESOLVED,
    });
    return {
      ok: true,
      saved: true,
      ein,
      eins: listedBefore.eins,
      rows: resolvedRows,
      duplicateResolved: true,
    };
  }

  const sortOrder = listedBefore.ok ? listedBefore.eins.length : 0;
  const payload = {
    user_id: workosUserId,
    ein,
    sort_order: sortOrder,
    ...(profileId ? { profile_id: profileId } : {}),
  };

  let { error: upsErr } = await admin.from(SAVED_ORG_TABLE).upsert(payload, { onConflict: "user_id,ein" });
  if (upsErr) {
    const missingCol =
      String(upsErr.message || "").toLowerCase().includes("profile_id") || String(upsErr.code || "") === "PGRST204";
    if (missingCol) {
      ({ error: upsErr } = await admin
        .from(SAVED_ORG_TABLE)
        .upsert({ user_id: workosUserId, ein, sort_order: sortOrder }, { onConflict: "user_id,ein" }));
    }
  }
  if (upsErr) {
    logSavedOrgEvent("toggle_save_failed", {
      correlationId,
      mutationId,
      workosUserId,
      profileId,
      organizationId: ein,
      dbError: upsErr.code || upsErr.message,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
    });
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
      status: 500,
      message: upsErr.message || "Could not save organization.",
    };
  }

  const listed = await listSavedEinsForUser(admin, workosUserId);
  const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, [ein]);
  logSavedOrgEvent("toggle_save_ok", {
    correlationId,
    mutationId,
    workosUserId,
    profileId,
    organizationId: ein,
    entityType: "nonprofit_ein",
    action: "save",
    count: listed.eins.length,
  });
  return {
    ok: true,
    saved: true,
    ein,
    eins: listed.ok ? listed.eins : [ein],
    rows: resolvedRows,
  };
}

/**
 * Idempotent unsave by EIN.
 */
export async function unsaveOrganizationByEin(admin, args) {
  const { workosUserId, profileId = null, correlationId = null, mutationId = null } = args;
  const ein = normalizeEinDigits(args.ein);
  if (ein.length !== 9) {
    return { ok: false, code: SAVED_ORG_ERRORS.INVALID_EIN, status: 400, message: "A valid 9-digit EIN is required." };
  }

  const { error: delErr } = await admin.from(SAVED_ORG_TABLE).delete().eq("user_id", workosUserId).eq("ein", ein);
  if (delErr) {
    logSavedOrgEvent("toggle_unsave_failed", {
      correlationId,
      mutationId,
      workosUserId,
      profileId,
      organizationId: ein,
      dbError: delErr.code || delErr.message,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
    });
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
      status: 500,
      message: delErr.message || "Could not remove saved organization.",
    };
  }

  const listed = await listSavedEinsForUser(admin, workosUserId);
  logSavedOrgEvent("toggle_unsave_ok", {
    correlationId,
    mutationId,
    workosUserId,
    profileId,
    organizationId: ein,
    entityType: "nonprofit_ein",
    action: "unsave",
    count: listed.eins.length,
  });
  return {
    ok: true,
    saved: false,
    ein,
    eins: listed.ok ? listed.eins : [],
  };
}

/**
 * Replace full EIN list (legacy PUT). Validates new EINs; keeps already-saved even if
 * directory lookup temporarily fails.
 */
export async function replaceSavedEinsForUser(admin, args) {
  const { workosUserId, profileId = null, correlationId = null } = args;
  const list = orderUniqueEins(args.eins);

  const existingListed = await listSavedEinsForUser(admin, workosUserId);
  if (!existingListed.ok) {
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.SAVED_STATE_UNAVAILABLE,
      status: 500,
      message: existingListed.error?.message || "Could not read saved organizations.",
    };
  }
  const existing = new Set(existingListed.eins);

  const rejected = [];
  const accepted = [];
  for (const ein of list) {
    if (existing.has(ein)) {
      accepted.push(ein);
      continue;
    }
    const ok = await organizationExistsForSave(admin, ein);
    if (ok) accepted.push(ein);
    else rejected.push(ein);
  }

  if (rejected.length && !accepted.length && list.length) {
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.ORGANIZATION_NOT_FOUND,
      status: 400,
      message: "One or more organizations could not be saved because they are not in the directory.",
      rejectedEins: rejected,
    };
  }

  const next = new Set(accepted);
  const toRemove = [...existing].filter((e) => !next.has(e));
  if (toRemove.length) {
    const { error: delErr } = await admin.from(SAVED_ORG_TABLE).delete().eq("user_id", workosUserId).in("ein", toRemove);
    if (delErr) {
      return {
        ok: false,
        code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
        status: 500,
        message: delErr.message,
      };
    }
  }

  if (!accepted.length) {
    logSavedOrgEvent("put_cleared", { correlationId, workosUserId, profileId, rejectedCount: rejected.length });
    return { ok: true, eins: [], rejectedEins: rejected, rows: [] };
  }

  const rows = accepted.map((ein, i) => ({
    user_id: workosUserId,
    ein,
    sort_order: i,
    ...(profileId ? { profile_id: profileId } : {}),
  }));
  let { error: upsErr } = await admin.from(SAVED_ORG_TABLE).upsert(rows, { onConflict: "user_id,ein" });
  if (upsErr) {
    const missingCol =
      String(upsErr.message || "").toLowerCase().includes("profile_id") || String(upsErr.code || "") === "PGRST204";
    if (missingCol) {
      ({ error: upsErr } = await admin.from(SAVED_ORG_TABLE).upsert(
        accepted.map((ein, i) => ({ user_id: workosUserId, ein, sort_order: i })),
        { onConflict: "user_id,ein" },
      ));
    }
  }
  if (upsErr) {
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
      status: 500,
      message: upsErr.message,
    };
  }

  const resolvedRows = await resolveSavedOrganizationDirectoryRows(admin, accepted);
  logSavedOrgEvent("put_ok", {
    correlationId,
    workosUserId,
    profileId,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    removedCount: toRemove.length,
  });
  return { ok: true, eins: accepted, rejectedEins: rejected, rows: resolvedRows };
}

/**
 * Persist trusted entity keys. When a key maps to a registry EIN, also ensure the EIN
 * row exists so Profile → Saved Organizations can display a real name.
 */
export async function replaceTrustedFavoriteKeys(admin, args) {
  const { workosUserId, profileId = null, correlationId = null } = args;
  const incoming = [...new Set((args.keys || []).map(normalizeTrustedEntityKey).filter(Boolean))].slice(0, 500);

  const remainingKeys = [];
  const promotedOk = [];
  for (const key of incoming) {
    const slug = key.replace(/^trusted:/, "");
    const ein = resolveTrustedSlugToEin(slug);
    if (!ein) {
      remainingKeys.push(key);
      continue;
    }
    const result = await saveOrganizationByEin(admin, {
      workosUserId,
      profileId,
      ein,
      correlationId,
    });
    if (result.ok) {
      promotedOk.push(ein);
      continue;
    }
    if (result.code === SAVED_ORG_ERRORS.ORGANIZATION_NOT_FOUND) {
      // Keep slug key so the favorite is never silently dropped.
      remainingKeys.push(key);
      continue;
    }
    return result;
  }

  const keys = [...new Set(remainingKeys.map(normalizeTrustedEntityKey).filter(Boolean))].slice(0, 500);
  const merged = await mergeProfileMetadataByWorkOSId(admin, workosUserId, { favoriteEntityKeys: keys });
  if (!merged.ok) {
    logSavedOrgEvent("favorites_put_failed", {
      correlationId,
      workosUserId,
      profileId,
      reason: merged.reason || "update_failed",
    });
    return {
      ok: false,
      code: SAVED_ORG_ERRORS.DATABASE_WRITE_FAILED,
      status: 500,
      message: merged.reason || "Could not save favorites.",
    };
  }

  logSavedOrgEvent("favorites_put_ok", {
    correlationId,
    workosUserId,
    profileId,
    count: keys.length,
    promotedEinCount: promotedOk.length,
  });
  return { ok: true, keys, promotedEins: orderUniqueEins(promotedOk) };
}

/**
 * Build profile card payloads for slug-only trusted favorites.
 */
export function resolveTrustedEntityKeyCards(keys = []) {
  const out = [];
  for (const key of keys) {
    const normalized = normalizeTrustedEntityKey(key);
    if (!normalized) continue;
    const slug = normalized.replace(/^trusted:/, "");
    const alias = TRUSTED_SLUG_ALIASES[slug] || slug;
    const record = TRUSTED_RESOURCE_BY_SLUG[alias] || TRUSTED_RESOURCE_BY_SLUG[slug];
    if (!record) {
      out.push({
        entityKey: normalized,
        trustedResourceSlug: slug,
        orgName: "",
        name: "",
        savedResolutionStatus: "unavailable",
        organizationUnavailable: true,
        entityType: "trusted_resource",
        detailPath: `/trusted/${slug}`,
      });
      continue;
    }
    const ein = normalizeTrustedResourceEin(record.eins?.[0] || "");
    out.push({
      entityKey: normalized,
      trustedResourceSlug: record.slug,
      orgName: record.displayName,
      name: record.displayName,
      canonicalDisplayName: record.displayName,
      ein: ein || "",
      einNormalized: ein || "",
      nonprofitId: ein || normalized,
      logoUrl: record.registryLogoUrl || "",
      website: record.website || "",
      city: "",
      state: "",
      shortDescription: record.shortDescription || "",
      savedResolutionStatus: "resolved",
      organizationUnavailable: false,
      entityType: "trusted_resource",
      detailPath: `/trusted/${record.slug}`,
      isTrusted: true,
    });
  }
  return out;
}

/**
 * Load favorite entity keys for a WorkOS user.
 */
export async function listTrustedFavoriteKeysForUser(admin, workosUserId) {
  const row = await getProfileRowByWorkOSId(admin, workosUserId);
  return { ok: true, keys: listTrustedEntityKeysFromProfileRow(row), profileRow: row };
}
