"use client";

import AdminHorizontalNav from "@/components/admin/AdminHorizontalNav";
import AdminSearch from "@/components/admin/AdminSearch";
import AdminContentContainer from "@/components/admin/AdminContentContainer";

/**
 * Admin chrome below the shared site header — nav, search, and page content in document flow.
 */
export default function AdminLayout({ children, sessionEmail = "" }) {
  return (
    <div className="adminLayout">
      <div className="adminLayout__intro">
        <h1 className="adminLayout__title">Platform admin</h1>
        {sessionEmail ? <span className="adminLayout__session adminMuted">{sessionEmail}</span> : null}
      </div>
      <AdminHorizontalNav />
      <AdminSearch />
      <AdminContentContainer>{children}</AdminContentContainer>
    </div>
  );
}
