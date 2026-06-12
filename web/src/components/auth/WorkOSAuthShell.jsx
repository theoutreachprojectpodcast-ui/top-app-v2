"use client";

import BrandMark from "@/components/BrandMark";
import "@/styles/workos-auth-shell.css";

/**
 * Branded shell for WorkOS handoff / callback client pages (matches hosted AuthKit tone).
 *
 * @param {{
 *   title?: string,
 *   lead?: string,
 *   busy?: boolean,
 *   error?: string,
 *   children?: import("react").ReactNode,
 * }} props
 */
export default function WorkOSAuthShell({
  title = "The Outreach Project",
  lead = "",
  busy = false,
  error = "",
  children,
}) {
  return (
    <div className="workosAuthShell">
      <div className="workosAuthShell__inner">
        <div className="workosAuthShell__brand">
          <BrandMark variant="mark" size="splash" alt="The Outreach Project" />
        </div>
        <h1 className="workosAuthShell__title">{title}</h1>
        {busy ? <div className="workosAuthShell__spinner" aria-hidden="true" /> : null}
        {error ? (
          <p className="workosAuthShell__notice workosAuthShell__notice--warn" role="alert">
            {error}
          </p>
        ) : null}
        {lead ? <p className="workosAuthShell__lead">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}
