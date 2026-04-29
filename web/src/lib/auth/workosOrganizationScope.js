import { decodeJwt } from "jose";

/**
 * WorkOS Organization ID for The Outreach Project (User Management → Organizations).
 * When set, sign-in/up URLs pin this org and API/RSC sessions must match `org_id` on the access token.
 */
export function expectedWorkOSOrganizationId() {
  return String(process.env.WORKOS_ORGANIZATION_ID || "").trim();
}

/** @returns {Record<string, string> | {}} */
export function workOSAuthKitAuthorizeOptions() {
  const organizationId = expectedWorkOSOrganizationId();
  return organizationId ? { organizationId } : {};
}

/**
 * @param {{ organizationId?: string, accessToken?: string } | null | undefined} session
 * @returns {boolean}
 */
export function sessionMatchesExpectedWorkOSOrganization(session) {
  const expected = expectedWorkOSOrganizationId();
  if (!expected) return true;

  let orgId = session?.organizationId ? String(session.organizationId).trim() : "";
  if (!orgId && session?.accessToken) {
    try {
      const claims = decodeJwt(session.accessToken);
      orgId = String(claims.org_id || claims.organization_id || "").trim();
    } catch {
      orgId = "";
    }
  }
  return orgId === expected;
}
