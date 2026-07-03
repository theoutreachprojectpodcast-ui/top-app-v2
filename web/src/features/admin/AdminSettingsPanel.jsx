"use client";

import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

export default function AdminSettingsPanel() {
  return (
    <>
      <AdminPanelShell panelId="settings">
        <nav className="adminAdvancedLinks">
          <Link href="/admin/contact">Contact routing & submissions</Link>
          <Link href="/admin/advanced">Advanced / QA</Link>
        </nav>
      </AdminPanelShell>
      <AdminScopeBanner readiness="partial" title="Homepage settings (live)">
        Carousel and featured sponsor settings below persist via admin APIs.
      </AdminScopeBanner>
      <AdminHomepagePanel />
    </>
  );
}
