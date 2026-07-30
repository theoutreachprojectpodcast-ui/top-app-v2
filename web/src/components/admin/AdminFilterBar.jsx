"use client";

/**
 * Search + filter toolbar for list pages.
 */
export default function AdminFilterBar({ children, className = "" }) {
  return <div className={`adminFilterBar ${className}`.trim()}>{children}</div>;
}
