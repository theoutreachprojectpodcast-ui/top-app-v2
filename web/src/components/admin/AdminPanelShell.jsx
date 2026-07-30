"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getAdminLiveSiteMeta } from "@/lib/admin/adminLiveSiteHints";

/**
 * Standard admin panel wrapper with page header, live-site hint, and feedback.
 */
export default function AdminPanelShell({
  panelId,
  title,
  description,
  liveHint,
  message = "",
  error = "",
  nested = false,
  status = "",
  statusLabel = "",
  primaryAction = null,
  secondaryActions = null,
  children,
}) {
  const meta = panelId ? getAdminLiveSiteMeta(panelId) : null;
  const resolvedTitle = title ?? meta?.title ?? "";
  const resolvedDescription = description ?? meta?.description ?? "";
  const resolvedLiveHint = liveHint ?? meta?.liveHint ?? "";

  const resolvedStatus =
    status || (meta?.readiness === "partial" ? "partial" : meta?.readiness === "production" ? "live" : "");

  return (
    <section className={`adminPanelShell adminPanel${nested ? " adminPanel--nested" : ""}`}>
      {resolvedTitle ? (
        <AdminPageHeader
          title={resolvedTitle}
          description={resolvedDescription}
          status={resolvedStatus}
          statusLabel={statusLabel}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        >
          {resolvedLiveHint ? (
            <p className="adminPanelShell__liveHint adminMuted">
              <strong>Live site:</strong> {resolvedLiveHint}
            </p>
          ) : null}
        </AdminPageHeader>
      ) : null}
      {error ? (
        <p className="adminFeedback adminFeedback--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="adminFeedback adminFeedback--success" role="status">
          {message}
        </p>
      ) : null}
      <div className="adminPanelShell__body">{children}</div>
    </section>
  );
}
