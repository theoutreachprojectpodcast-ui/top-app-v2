"use client";

import AdminSectionEditor from "@/components/admin/AdminSectionEditor";
import { getAdminLiveSiteMeta } from "@/lib/admin/adminLiveSiteHints";

/**
 * Standard admin panel wrapper with title, description, and live-site hint.
 */
export default function AdminPanelShell({
  panelId,
  title,
  description,
  liveHint,
  message = "",
  error = "",
  nested = false,
  children,
}) {
  const meta = panelId ? getAdminLiveSiteMeta(panelId) : null;
  const resolvedTitle = title ?? meta?.title ?? "";
  const resolvedDescription = description ?? meta?.description ?? "";
  const resolvedLiveHint = liveHint ?? meta?.liveHint ?? "";

  return (
    <AdminSectionEditor
      title={resolvedTitle}
      description={resolvedDescription}
      liveHint={resolvedLiveHint}
      message={message}
      error={error}
      className={nested ? "adminPanel adminPanel--nested" : "adminPanel"}
    >
      {children}
    </AdminSectionEditor>
  );
}
