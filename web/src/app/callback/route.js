import { handleAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertProfileFromWorkOSUser } from "@/lib/profile/serverProfile";
import { appBaseUrl } from "@/lib/billing/stripeConfig";
import { notifyStaffProfiles } from "@/server/notifications/notificationService";

const baseURL = appBaseUrl();

export const GET = handleAuth({
  returnPathname: "/",
  baseURL,
  onSuccess: async ({ user }) => {
    try {
      const admin = createSupabaseAdminClient();
      if (!admin) return;
      const out = await upsertProfileFromWorkOSUser(admin, user);
      if (out?.ok && out.isNew) {
        await notifyStaffProfiles(admin, {
          type: "new_user_signup",
          title: "New member signed up",
          message: `${user.email || user.id} created a TOP account (first WorkOS sign-in).`,
          linkPath: "/profile",
          entityType: "workos_user",
          entityId: user.id,
          dedupeHours: 1,
          metadata: { workos_user_id: user.id },
        });
      }
    } catch (e) {
      console.error("[torp] WorkOS onSuccess profile sync failed:", e);
    }
  },
});
