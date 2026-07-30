"use client";

import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminAdvancedSettings from "@/components/admin/AdminAdvancedSettings";

export default function AdminSettingsPanel() {
  return (
    <>
      <AdminPanelShell panelId="settings" status="partial">
        <nav className="adminTaskGrid">
          <Link className="adminTaskCard" href="/admin/contact">
            <strong>Contact inbox</strong>
            <span className="adminMuted">Routing and submissions</span>
          </Link>
          <Link className="adminTaskCard" href="/admin/advanced">
            <strong>Integrations & tools</strong>
            <span className="adminMuted">Diagnostics and system status</span>
          </Link>
          <Link className="adminTaskCard" href="/admin/content">
            <strong>Home content</strong>
            <span className="adminMuted">Preferred place for homepage carousel settings</span>
          </Link>
        </nav>
      </AdminPanelShell>
      <AdminAdvancedSettings
        title="Homepage settings (also on Content → Home)"
        description="Carousel timing and featured sponsor settings. Prefer Content → Home for day-to-day homepage edits."
      >
        <AdminScopeBanner readiness="partial" title="Homepage settings">
          These settings still work here for operators who bookmarked this page.
        </AdminScopeBanner>
        <AdminHomepagePanel />
      </AdminAdvancedSettings>
    </>
  );
}
