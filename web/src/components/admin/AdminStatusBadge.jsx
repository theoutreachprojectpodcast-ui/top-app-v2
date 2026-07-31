"use client";

/**
 * Consistent status chip for admin pages.
 * @param {{ status?: string, children?: import('react').ReactNode, className?: string }} props
 */
export default function AdminStatusBadge({ status = "live", children, className = "" }) {
  const key = String(status || "live").toLowerCase().replace(/\s+/g, "_");
  const label =
    children ??
    ({
      live: "Live",
      published: "Published",
      draft: "Draft",
      scheduled: "Scheduled",
      unpublished: "Unpublished",
      archived: "Archived",
      disabled: "Disabled",
      partial: "Partial",
      attention: "Needs attention",
      beta: "Beta",
      preview: "Preview",
      moderator: "Moderator",
      review: "Under review",
      under_review: "Under review",
      pending: "Submitted",
      submitted: "Submitted",
      approved: "Approved",
      ok: "Approved",
    }[key] || status);

  return (
    <span className={`adminStatusBadge adminStatusBadge--${key} ${className}`.trim()} data-status={key}>
      {label}
    </span>
  );
}
