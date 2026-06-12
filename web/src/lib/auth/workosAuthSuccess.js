import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { patchProfileByWorkOSId, upsertProfileFromWorkOSUser, getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { notifyStaffProfiles } from "@/server/notifications/notificationService";
import { ensureWorkOSOrganizationMembership } from "@/lib/auth/workosEnsureOrgMembership";

/** Profile/org sync after OAuth — must not block callback redirect (Vercel timeout → browser "page couldn't load"). */
async function syncWorkOSUserAfterAuth(user) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const out = await upsertProfileFromWorkOSUser(admin, user);
    await ensureWorkOSOrganizationMembership(user.id);
    const email = String(user?.email || "").trim();
    const row = await getProfileRowByWorkOSId(admin, user.id);
    const isAdmin =
      (email && isDefaultApprovedAdminEmail(email)) ||
      isPlatformAdminServer({ email, workosUserId: user.id, profileRow: row });
    if (out?.ok && isAdmin) {
      const tier = String(row?.membership_tier || "free").toLowerCase();
      await patchProfileByWorkOSId(admin, user.id, {
        platform_role: "admin",
        admin_access_enabled: true,
        admin_access_granted_by: String(row?.admin_access_granted_by || "").trim() || "workos-bootstrap",
        ...(tier === "free" || !tier
          ? { membership_tier: "member", membership_status: "active", onboarding_completed: true }
          : {}),
      });
    }
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
}

/** Shared WorkOS AuthKit onSuccess hook for web and mobile callbacks. */
export async function onWorkOSSuccess({ user }) {
  void syncWorkOSUserAfterAuth(user);
}
