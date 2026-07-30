"use client";

/**
 * Empty list / empty section state.
 */
export default function AdminEmptyState({
  title = "Nothing here yet",
  description = "",
  action = null,
}) {
  return (
    <div className="adminEmptyState">
      <strong className="adminEmptyState__title">{title}</strong>
      {description ? <p className="adminEmptyState__desc adminMuted">{description}</p> : null}
      {action ? <div className="adminEmptyState__action">{action}</div> : null}
    </div>
  );
}
