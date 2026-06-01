import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

const DEFAULT_APPROVED_ADMIN_EMAILS = Object.freeze([
  "andy@volentelabs.com",
  "andy@valentelabs.io",
  "jmelching1@gmail.com",
  "hodge5403@gmail.com",
]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function emailsFromEnv(key) {
  return String(process.env[key] || "")
    .split(",")
    .map((part) => normalizeEmail(part))
    .filter(Boolean);
}

function buildApprovedAdminEmailSet() {
  const set = new Set(DEFAULT_APPROVED_ADMIN_EMAILS.map(normalizeEmail).filter(Boolean));
  for (const email of emailsFromEnv("PLATFORM_ADMIN_EMAILS")) {
    set.add(email);
  }
  if (isQaDeploymentContext()) {
    for (const email of emailsFromEnv("QA_PLATFORM_ADMIN_EMAILS")) {
      set.add(email);
    }
  }
  return set;
}

export function approvedAdminEmailSet() {
  return buildApprovedAdminEmailSet();
}

export function isDefaultApprovedAdminEmail(email) {
  const em = normalizeEmail(email);
  if (!em) return false;
  return buildApprovedAdminEmailSet().has(em);
}

/**
 * Manual admin grant: existing admin promoted this account later.
 * Required fields are additive migration columns on `torp_profiles`.
 */
export function hasManualAdminGrant(profileRow = null) {
  if (!profileRow || typeof profileRow !== "object") return false;
  const role = String(profileRow.platform_role || "").trim().toLowerCase();
  if (role !== "admin") return false;
  const enabled = profileRow.admin_access_enabled == null ? true : !!profileRow.admin_access_enabled;
  const grantedBy = String(profileRow.admin_access_granted_by || "").trim();
  return enabled && grantedBy.length > 0;
}
