import { handleAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertProfileFromWorkOSUser } from "@/lib/profile/serverProfile";
import { appBaseUrl } from "@/lib/billing/stripeConfig";

const baseURL = appBaseUrl();

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
