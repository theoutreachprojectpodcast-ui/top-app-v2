"use client";

/**
 * Short helper under a field label.
 */
export default function AdminHelpText({ children }) {
  if (!children) return null;
  return <p className="adminHelpText adminMuted">{children}</p>;
}
