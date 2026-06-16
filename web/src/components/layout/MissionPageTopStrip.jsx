"use client";

import PublicPageContentSlot from "@/components/content/PublicPageContentSlot";
import {
  MISSION_STRIP_BADGE,
  MISSION_STRIP_MISSION_NOTE,
  MISSION_STRIP_TAGLINE,
} from "@/lib/constants";

/**
 * Brand + mission strip for main app shells.
 * Footer copy can be overridden by approved page_content_blocks (page_key=footer).
 * @param {"top" | "bottom"} [placement="top"] — Home hero: `top` (under the bar). Other tabs / site routes: `bottom` (end of main content).
 */
export default function MissionPageTopStrip({ placement = "top" }) {
  const positionClass = placement === "bottom" ? "siteFooter--pageBottom" : "siteFooter--pageTop";
  return (
    <footer className={`siteFooter ${positionClass} siteFooter--inMainShell`} aria-label="The Outreach Project">
      <div className="footerInner">
        <div className="brandName">THE OUTREACH PROJECT</div>
        <span className="footerInner__badge">{MISSION_STRIP_BADGE}</span>
        <PublicPageContentSlot
          pageKey="footer"
          sectionKey="mission_note"
          className="footerNote footerNote--mission"
          fallback={<p>{MISSION_STRIP_MISSION_NOTE}</p>}
        />
        <PublicPageContentSlot
          pageKey="footer"
          sectionKey="tagline"
          className="footerNote footerNote--tagline"
          fallback={<p>{MISSION_STRIP_TAGLINE}</p>}
        />
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
