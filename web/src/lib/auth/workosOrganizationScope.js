import { decodeJwt } from "jose";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";

/**
 * WorkOS Organization ID for The Outreach Project (User Management → Organizations).
 * When set, sign-in/up URLs pin this org and API/RSC sessions must match `org_id` on the access token.
 */
export function expectedWorkOSOrganizationId() {
  return String(process.env.WORKOS_ORGANIZATION_ID || "").trim();
}

/**
 * Options for `getSignInUrl` / `getSignUpUrl`.
 * Skips `organizationId` for sign-up and bootstrap admin sign-in (WorkOS rejects non-members at the hosted UI).
 *
 * @param {{ loginHint?: string, bootstrap?: boolean, signUp?: boolean }} [options]
 * @returns {Record<string, string> | {}}
 */
export function workOSAuthKitAuthorizeOptions(options = {}) {
  const organizationId = expectedWorkOSOrganizationId();
  if (!organizationId) return {};

  if (options.signUp || options.bootstrap) return {};

  const hint = String(options.loginHint || "").trim().toLowerCase();
  if (hint && isDefaultApprovedAdminEmail(hint)) return {};

  return { organizationId };
}

/**
 * Bootstrap sign-in is only for platform admin entry (returnTo under `/admin`).
 * @param {URLSearchParams} searchParams
 */
export function isBootstrapAdminWorkOSSignIn(searchParams) {
  if (searchParams.get("bootstrap") !== "1") return false;
  const raw = String(searchParams.get("returnTo") || "/admin").trim();
  const path = raw.startsWith("/") ? raw : "/admin";
  return path === "/admin" || path.startsWith("/admin/");
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

/**
 * Whether a WorkOS session may use member/admin APIs.
 * Approved platform-admin emails may sign in when `org_id` is missing or mismatched
 * (common for WorkOS dashboard owners who are not yet org members).
 *
 * @param {{ organizationId?: string, accessToken?: string, user?: { email?: string } } | null | undefined} session
 * @param {{ email?: string }} [options]
 */
export function sessionAuthorizedForWorkOS(session, options = {}) {
  if (sessionMatchesExpectedWorkOSOrganization(session)) return true;
  const email = String(options.email || session?.user?.email || "").trim();
  if (email && isDefaultApprovedAdminEmail(email)) return true;
  return false;
}
