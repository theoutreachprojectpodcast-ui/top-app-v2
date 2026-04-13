import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getProfileRowByWorkOSId,
  profileRowToClientDto,
  syncProfileEmailWithWorkOSUser,
} from "@/lib/profile/serverProfile";
import { computeEntitlementsFromProfileRow } from "@/lib/account/entitlements";
import { computeProfileCompletion } from "@/lib/profile/profileCompletion";

export async function GET() {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({
      authenticated: false,
      profile: null,
      profileCompletion: null,
      entitlements: {
        podcastMemberContent: false,
        communityStorySubmit: false,
        isPrivilegedStaff: false,
      },
    });
  }
  const admin = createSupabaseAdminClient();
  let profileDto = null;
  let row = null;
  const sessionEmail = String(auth.user.email || "").trim();
  if (admin) {
    await syncProfileEmailWithWorkOSUser(admin, auth.user);
    row = await getProfileRowByWorkOSId(admin, auth.user.id);
    profileDto = profileRowToClientDto(row);
  }
  if (profileDto && sessionEmail && !String(profileDto.email || "").trim()) {
    profileDto = { ...profileDto, email: sessionEmail };
  }
  const entitlements = row ? computeEntitlementsFromProfileRow(row) : {
    podcastMemberContent: false,
    communityStorySubmit: false,
    isPrivilegedStaff: false,
  };
  const profileCompletion = computeProfileCompletion(profileDto);
  return Response.json({
    authenticated: true,
    profile: profileDto,
    profileCompletion,
    entitlements,
    user: {
      email: auth.user.email ?? "",
      firstName: auth.user.firstName ?? "",
      lastName: auth.user.lastName ?? "",
    },
  });
}
