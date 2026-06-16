"use client";

import BrandMark from "@/components/BrandMark";
import PublicPageContentSlot from "@/components/content/PublicPageContentSlot";

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
        <BrandMark variant="mark" className="footerInner__mark" alt="" />
        <div className="brandName">THE OUTREACH PROJECT</div>
        <span className="footerInner__badge">Resource Network</span>
        <PublicPageContentSlot
          pageKey="footer"
          sectionKey="mission_note"
          className="footerNote footerNote--mission"
          fallback={
            <p>Mission-first resource navigation for veterans, first responders, and supporters.</p>
          }
        />
        <PublicPageContentSlot
          pageKey="footer"
          sectionKey="tagline"
          className="footerNote footerNote--tagline"
          fallback={<p>Trust-driven support, built for clarity under pressure.</p>}
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
