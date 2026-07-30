"use client";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

/**
 * Standard admin page header: title, description, status, actions.
 * @param {{
 *   title: string,
 *   description?: string,
 *   status?: string,
 *   statusLabel?: string,
 *   lastUpdated?: string,
 *   lastUpdatedBy?: string,
 *   primaryAction?: import('react').ReactNode,
 *   secondaryActions?: import('react').ReactNode,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function AdminPageHeader({
  title,
  description = "",
  status = "",
  statusLabel = "",
  lastUpdated = "",
  lastUpdatedBy = "",
  primaryAction = null,
  secondaryActions = null,
  children = null,
}) {
  return (
    <header className="adminPageHeader">
      <div className="adminPageHeader__main">
        <div className="adminPageHeader__titles">
          <h2 className="adminPageHeader__title">{title}</h2>
          {description ? <p className="adminPageHeader__desc">{description}</p> : null}
          <div className="adminPageHeader__meta">
            {status ? <AdminStatusBadge status={status}>{statusLabel || undefined}</AdminStatusBadge> : null}
            {lastUpdated ? (
              <span className="adminMuted adminPageHeader__updated">
                Updated {lastUpdated}
                {lastUpdatedBy ? ` · ${lastUpdatedBy}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        {(primaryAction || secondaryActions) && (
          <div className="adminPageHeader__actions">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
      {children}
    </header>
  );
}
