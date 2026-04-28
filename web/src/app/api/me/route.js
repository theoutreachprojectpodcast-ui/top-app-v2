import { withAuth } from "@workos-inc/authkit-nextjs";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getProfileRowByWorkOSId,
  profileRowToClientDto,
  syncProfileEmailWithWorkOSUser,
} from "@/lib/profile/serverProfile";
import { computeEntitlementsFromProfileRow } from "@/lib/account/entitlements";
import { computeProfileCompletion } from "@/lib/profile/profileCompletion";

function unauthenticatedMeResponse() {
  return Response.json({
    authenticated: false,
    profile: null,
    profileCompletion: null,
    entitlements: {
      podcastMemberContent: false,
      communityStorySubmit: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
    },
  });
}

export async function GET() {
  if (!isWorkOSConfigured()) {
    return unauthenticatedMeResponse();
  }

  let user = null;
  try {
    const auth = await withAuth();
    user = auth?.user ?? null;
  } catch {
    const cookieSession = await getWorkOSUserFromCookies();
    user = cookieSession?.user ?? null;
  }

  if (!user) {
    return unauthenticatedMeResponse();
  }
  const admin = createSupabaseAdminClient();
  let profileDto = null;
  let row = null;
  const sessionEmail = String(user.email || "").trim();
  if (admin) {
    await syncProfileEmailWithWorkOSUser(admin, user);
    row = await getProfileRowByWorkOSId(admin, user.id);
    profileDto = profileRowToClientDto(row);
  }
  if (profileDto && sessionEmail && !String(profileDto.email || "").trim()) {
    profileDto = { ...profileDto, email: sessionEmail };
  }
  const entitlements = row ? computeEntitlementsFromProfileRow(row) : {
    podcastMemberContent: false,
    communityStorySubmit: false,
    isPrivilegedStaff: false,
    isPlatformAdmin: false,
  };
  const profileCompletion = computeProfileCompletion(profileDto);
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
