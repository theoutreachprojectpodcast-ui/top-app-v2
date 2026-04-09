import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import {
  MEMBERSHIP_TIER_KEYS,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

export async function GET() {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({
      authenticated: false,
      profile: null,
      entitlements: { podcastMemberContent: false },
    });
  }
  const admin = createSupabaseAdminClient();
  let profileDto = null;
  if (admin) {
    const row = await getProfileRowByWorkOSId(admin, auth.user.id);
    profileDto = profileRowToClientDto(row);
  }
  const tierKey = profileDto ? normalizeMembershipTierKey(profileDto.membershipTier) : MEMBERSHIP_TIER_KEYS.NONE;
  const entitlements = {
    podcastMemberContent: tierKey === MEMBERSHIP_TIER_KEYS.MEMBER,
  };
  return Response.json({
    authenticated: true,
    profile: profileDto,
    entitlements,
    user: {
      email: auth.user.email ?? "",
      firstName: auth.user.firstName ?? "",
      lastName: auth.user.lastName ?? "",
    },
  });
}
