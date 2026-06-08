"use client";

import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";

export default function AdminSettingsPanel() {
  return (
    <>
      <div className="adminPanel">
        <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          Settings
        </h1>
        <p className="adminMuted">Platform configuration surfaces. Expand per-module settings over time.</p>
        <nav className="adminAdvancedLinks">
          <Link href="/admin/contact">Contact routing & submissions</Link>
          <Link href="/admin/advanced">Advanced / QA</Link>
        </nav>
      </div>
      <AdminScopeBanner readiness="partial" title="Homepage settings (live)">
        Carousel and featured sponsor settings below persist via admin APIs.
      </AdminScopeBanner>
      <AdminHomepagePanel />
    </>
  );
}
