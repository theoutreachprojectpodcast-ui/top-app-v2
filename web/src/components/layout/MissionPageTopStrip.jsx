"use client";

import {
  MISSION_STRIP_BADGE,
  MISSION_STRIP_MISSION_NOTE,
} from "@/lib/constants";

/**
 * Brand + mission strip for main app shells.
 * @param {"top" | "bottom"} [placement="top"] — Home hero: `top` (under the bar). Other tabs / site routes: `bottom` (end of main content).
 */
export default function MissionPageTopStrip({ placement = "top" }) {
  const positionClass = placement === "bottom" ? "siteFooter--pageBottom" : "siteFooter--pageTop";
  return (
    <footer className={`siteFooter ${positionClass} siteFooter--inMainShell`} aria-label="The Outreach Project">
      <div className="footerInner">
        <div className="brandName">THE OUTREACH PROJECT</div>
        <span className="footerInner__badge">{MISSION_STRIP_BADGE}</span>
        <div className="footerNote footerNote--mission">
          <p>{MISSION_STRIP_MISSION_NOTE}</p>
        </div>
        <nav className="footerLegalNav" aria-label="Legal">
          <a href="/privacy">Privacy</a>
          <span aria-hidden="true"> · </span>
          <a href="/terms">Terms</a>
          <span aria-hidden="true"> · </span>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
