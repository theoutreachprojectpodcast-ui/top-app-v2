import BrandMark from "@/components/BrandMark";

/**
 * Logo is fixed and layered above the header gradient; title + subtitle flow in the top bar.
 */
export default function HeaderBrandLockup({ className = "" }) {
  return (
    <div className={`headerBrandLockup ${className}`.trim()}>
      <div className="headerLogoFloat">
        <BrandMark size="header" />
      </div>
      <div className="headerBrandCopy">
        <p className="headerBrandTitle">The Outreach Project</p>
        <p className="headerBrandSubtitle">Veteran First Responder Resource Network</p>
      </div>
    </div>
  );
}
