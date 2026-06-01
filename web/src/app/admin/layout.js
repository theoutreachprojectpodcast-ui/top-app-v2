import { redirect } from "next/navigation";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import { resolveAdminGateSession } from "@/lib/admin/resolveAdminGateSession";
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
  const gate = await resolveAdminGateSession();
  if (!gate.ok) {
    redirect(adminSignInRedirectUrl());
  }

  return <AdminAppShell sessionEmail={gate.email}>{children}</AdminAppShell>;
}
