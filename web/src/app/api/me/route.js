import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";

export async function GET() {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ authenticated: false, profile: null });
  }
  const admin = createSupabaseAdminClient();
  let profileDto = null;
  if (admin) {
    const row = await getProfileRowByWorkOSId(admin, auth.user.id);
    profileDto = profileRowToClientDto(row);
  }
  return Response.json({
    authenticated: true,
    profile: profileDto,
    user: {
      email: auth.user.email ?? "",
      firstName: auth.user.firstName ?? "",
      lastName: auth.user.lastName ?? "",
    },
  });
}
