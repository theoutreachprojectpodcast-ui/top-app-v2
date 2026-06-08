import { redirect } from "next/navigation";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import { resolveAdminGateSession } from "@/lib/admin/resolveAdminGateSession";
import AdminAppShell from "@/components/admin/AdminAppShell";
import "@/styles/admin-console.css";
import "@/styles/admin-route-shell.css";

export const dynamic = "force-dynamic";

function adminSignInRedirectUrl() {
  const q = new URLSearchParams({ returnTo: resolvePostAuthReturnTarget("/admin", "/admin") });
  // Relative path — absolute same-origin URLs can throw in RSC redirect() on production.
  return `/admin-login?${q.toString()}`;
}

export default async function AdminLayout({ children }) {
  const gate = await resolveAdminGateSession();
  if (!gate.ok) {
    redirect(adminSignInRedirectUrl());
  }

  return <AdminAppShell sessionEmail={gate.email}>{children}</AdminAppShell>;
}
