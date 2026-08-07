/**
 * Organization role authorization for bulk licensing.
 */

/** @typedef {'owner' | 'billing_admin' | 'license_admin' | 'viewer'} BulkOrgRole */

/** @type {Record<BulkOrgRole, number>} */
const ROLE_RANK = {
  viewer: 1,
  license_admin: 2,
  billing_admin: 3,
  owner: 4,
};

/**
 * @param {unknown} role
 * @returns {BulkOrgRole | null}
 */
export function normalizeBulkOrgRole(role) {
  const r = String(role || "").trim().toLowerCase();
  if (r === "owner" || r === "billing_admin" || r === "license_admin" || r === "viewer") {
    return r;
  }
  return null;
}

/**
 * @param {unknown} role
 * @param {BulkOrgRole} minimum
 */
export function roleAtLeast(role, minimum) {
  const r = normalizeBulkOrgRole(role);
  if (!r) return false;
  return ROLE_RANK[r] >= ROLE_RANK[minimum];
}

export function canManageBilling(role) {
  const r = normalizeBulkOrgRole(role);
  return r === "owner" || r === "billing_admin";
}

export function canManageLicenses(role) {
  const r = normalizeBulkOrgRole(role);
  return r === "owner" || r === "license_admin" || r === "billing_admin";
}

export function canViewFullLicenseCodes(role) {
  return canManageLicenses(role);
}

export function canInviteOrgAdmins(role) {
  return normalizeBulkOrgRole(role) === "owner";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} organizationId
 * @param {string} workosUserId
 */
export async function getOrgMembership(admin, organizationId, workosUserId) {
  const { data, error } = await admin
    .from("bulk_organization_members")
    .select("id, organization_id, workos_user_id, role, status, email")
    .eq("organization_id", organizationId)
    .eq("workos_user_id", workosUserId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} organizationId
 * @param {string} workosUserId
 * @param {{ requireBilling?: boolean, requireLicenses?: boolean }} [opts]
 */
export async function requireOrgAccess(admin, organizationId, workosUserId, opts = {}) {
  const membership = await getOrgMembership(admin, organizationId, workosUserId);
  if (!membership) {
    return { ok: false, error: "forbidden", message: "You are not a member of this organization." };
  }
  if (opts.requireBilling && !canManageBilling(membership.role)) {
    return { ok: false, error: "forbidden_billing", message: "Billing access required." };
  }
  if (opts.requireLicenses && !canManageLicenses(membership.role)) {
    return { ok: false, error: "forbidden_licenses", message: "License admin access required." };
  }
  return { ok: true, membership };
}
