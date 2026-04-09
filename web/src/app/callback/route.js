import { handleAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertProfileFromWorkOSUser } from "@/lib/profile/serverProfile";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const GET = handleAuth({
  returnPathname: "/",
  baseURL,
  onSuccess: async ({ user }) => {
    try {
      const admin = createSupabaseAdminClient();
      if (admin) await upsertProfileFromWorkOSUser(admin, user);
    } catch (e) {
      console.error("[torp] WorkOS onSuccess profile sync failed:", e);
    }
  },
});
