"use client";

/**
 * Brand + mission strip for main app shells.
 * @param {"top" | "bottom"} [placement="top"] — Home hero: `top` (under the bar). Other tabs / site routes: `bottom` (end of main content).
 */
export default function MissionPageTopStrip({ placement = "top" }) {
  const positionClass = placement === "bottom" ? "siteFooter--pageBottom" : "siteFooter--pageTop";
  return (
    <footer className={`siteFooter ${positionClass} siteFooter--inMainShell`} aria-label="The Outreach Project">
      <div className="footerInner">
        <div>
          <div className="brandName">THE OUTREACH PROJECT</div>
          <p className="footerNote">Mission-first resource navigation for veterans, first responders, and supporters.</p>
        </div>
        <p className="footerNote">Trust-driven support, built for clarity under pressure.</p>
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
