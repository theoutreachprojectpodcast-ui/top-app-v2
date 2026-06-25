import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  canSaveOrganizations,
  canViewCommunity,
  canViewDirectory,
  hasActiveMembership,
  requirePro,
  requireSupportOrPro,
} from "@/lib/membership/membershipAccess";
import { computeEntitlementsFromProfileRow } from "@/lib/account/entitlements";

/**
 * @param {Record<string, unknown> | null | undefined} profileRow
 * @param {'platform' | 'directory' | 'save_organizations' | 'community_view' | 'community_post' | 'podcast_premium' | 'trusted_pro'} scope
 */
export function profilePassesMembershipScope(profileRow, scope) {
  if (!profileRow) return false;
  const ent = computeEntitlementsFromProfileRow(profileRow);
  const opts = {
    isPlatformAdmin: ent.isPlatformAdmin,
    isPrivilegedStaff: ent.isPrivilegedStaff,
  };

  switch (scope) {
    case "platform":
      return requirePro(profileRow, opts);
    case "directory":
      return canViewDirectory(profileRow, opts);
    case "save_organizations":
      return canSaveOrganizations(profileRow, opts);
    case "community_view":
      return canViewCommunity(profileRow, opts);
    case "community_post":
      return requirePro(profileRow, opts);
    case "podcast_premium":
      return requirePro(profileRow, opts);
    case "trusted_pro":
      return requirePro(profileRow, opts);
    default:
      return requireSupportOrPro(profileRow, opts);
  }
}

/**
 * @param {string} scope
 * @param {{ upgrade?: string }} [extra]
 */
export function membershipDeniedResponse(scope, extra = {}) {
  const upgrade = extra.upgrade || (scope.includes("pro") || scope === "community_post" ? "pro" : "support");
  return Response.json(
    {
      ok: false,
      error: "membership_required",
      scope,
      upgrade,
      message:
        upgrade === "pro"
          ? "Pro Membership is required for this feature."
          : "An active Support or Pro membership is required.",
    },
    { status: 403 },
  );
}

/**
 * Resolve authenticated user + profile and enforce a membership scope on API routes.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {'platform' | 'directory' | 'save_organizations' | 'community_view' | 'community_post' | 'podcast_premium' | 'trusted_pro'} scope
 */
export async function requireMembershipApi(admin, scope) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return { ok: false, response: authFailureJson(auth) };

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "profile_required" }, { status: 403 }),
    };
  }

  if (!profilePassesMembershipScope(profileRow, scope)) {
    return { ok: false, response: membershipDeniedResponse(scope) };
  }

  return { ok: true, auth, profileRow };
}
