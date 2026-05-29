import { redirect } from "next/navigation";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { appPublicBaseUrl } from "@/lib/runtime/deploymentHosts";
import { appBaseUrl } from "@/lib/billing/stripeConfig";
import AdminAppShell from "@/components/admin/AdminAppShell";
import "@/styles/admin-console.css";

export const dynamic = "force-dynamic";

function apexOrigin() {
  return appBaseUrl().replace(/\/$/, "");
}

function adminSignInRedirectUrl() {
  const apex = apexOrigin();
  const q = new URLSearchParams({ returnTo: resolvePostAuthReturnTarget("/admin", "/admin") });
  return `${apex}/admin-login?${q.toString()}`;
}

export default async function AdminLayout({ children }) {
  const apex = apexOrigin();
  const auth = await getWorkOSUserFromCookies();
  if (!auth.user) {
    redirect(adminSignInRedirectUrl());
  }
  if (!sessionMatchesExpectedWorkOSOrganization(auth)) {
    redirect(adminSignInRedirectUrl());
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
    redirect(appPublicBaseUrl());
  }

  return <AdminAppShell sessionEmail={String(auth.user.email || "").trim()}>{children}</AdminAppShell>;
}
