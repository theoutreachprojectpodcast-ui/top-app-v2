import { redirect } from "next/navigation";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import AdminAppShell from "@/components/admin/AdminAppShell";
import "@/styles/admin-console.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const auth = await getWorkOSUserFromCookies();
  if (!auth.user) {
    redirect("/?signin=1");
  }
  if (!sessionMatchesExpectedWorkOSOrganization(auth)) {
    redirect("/?signin=1");
  }
  const admin = createSupabaseAdminClient();
  const row = admin ? await getProfileRowByWorkOSId(admin, auth.user.id) : null;
  if (
    !isPlatformAdminServer({
      email: auth.user.email,
      workosUserId: auth.user.id,
      profileRow: row,
    })
  ) {
    redirect("/");
  }

  return <AdminAppShell sessionEmail={String(auth.user.email || "").trim()}>{children}</AdminAppShell>;
}
