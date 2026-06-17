import { resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getProfileRowByWorkOSId,
  patchProfileByWorkOSId,
  profileRowToClientDto,
  syncProfileEmailWithWorkOSUser,
} from "@/lib/profile/serverProfile";
import { computeEntitlementsFromProfileRow } from "@/lib/account/entitlements";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { computeProfileCompletion } from "@/lib/profile/profileCompletion";

function entitlementsForSession(row, user) {
  if (row) return computeEntitlementsFromProfileRow(row);
  const isPlatformAdmin = isPlatformAdminServer({
    email: String(user.email || "").trim(),
    workosUserId: String(user.id || ""),
    profileRow: null,
  });
  return {
    podcastMemberContent: isPlatformAdmin,
    communityStorySubmit: isPlatformAdmin,
    communityPostCreate: isPlatformAdmin,
    isPrivilegedStaff: false,
    isPlatformAdmin,
  };
}

function unauthenticatedMeResponse() {
  return Response.json({
    authenticated: false,
    profile: null,
    profileCompletion: null,
    entitlements: null,
    user: null,
  });
}

export async function GET() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) {
    return unauthenticatedMeResponse();
  }
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  let profileDto = null;
  let row = null;
  const sessionEmail = String(user.email || "").trim();
  if (admin) {
    await syncProfileEmailWithWorkOSUser(admin, user);
    row = await getProfileRowByWorkOSId(admin, user.id);
    if (row) {
      const throttleMs = 5 * 60 * 1000;
      const prev = row.last_login_at ? new Date(row.last_login_at).getTime() : 0;
      const prevOk = Number.isFinite(prev) && prev > 0;
      if (!prevOk || Date.now() - prev > throttleMs) {
        await patchProfileByWorkOSId(admin, user.id, { last_login_at: new Date().toISOString() });
        row = await getProfileRowByWorkOSId(admin, user.id);
      }
    }
    profileDto = profileRowToClientDto(row);
  }
  if (profileDto && sessionEmail && !String(profileDto.email || "").trim()) {
    profileDto = { ...profileDto, email: sessionEmail };
  }
  const entitlements = row
    ? computeEntitlementsFromProfileRow({ ...row, email: sessionEmail || row.email })
    : entitlementsForSession(null, user);
  const profileCompletion = computeProfileCompletion(profileDto, {
    workOSUser: {
      email: user.email ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  });
  return Response.json({
    authenticated: true,
    profile: profileDto,
    profileCompletion,
    entitlements,
    user: {
      email: user.email ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  });
}
