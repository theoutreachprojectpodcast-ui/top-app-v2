import { redirect } from "next/navigation";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { appBaseUrl } from "@/lib/billing/stripeConfig";
import AdminAppShell from "@/components/admin/AdminAppShell";
import "@/styles/admin-console.css";

export const dynamic = "force-dynamic";

function apexOrigin() {
  return appBaseUrl().replace(/\/$/, "");
}

function adminSignInRedirectUrl() {
  const apex = apexOrigin();
  const adminBase = String(process.env.NEXT_PUBLIC_ADMIN_URL || "").trim().replace(/\/$/, "");
  const returnTo = adminBase ? `${adminBase}/` : "/admin";
  const q = new URLSearchParams();
  q.set("returnTo", returnTo);
  return `${apex}/api/auth/workos/signin?${q.toString()}`;
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
    redirect(`${apex}/`);
  }

  return <AdminAppShell sessionEmail={String(auth.user.email || "").trim()}>{children}</AdminAppShell>;
}
