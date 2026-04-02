import BrandMark from "@/components/BrandMark";

/**
 * Center header brand unit: logo + title + subtitle (single visual block).
 */
export default function HeaderBrandLockup({ className = "" }) {
  return (
    <div className={`headerBrandLockup ${className}`.trim()}>
      <BrandMark size="header" />
      <p className="headerBrandTitle">The Outreach Project</p>
      <p className="headerBrandSubtitle">Veteran First Responder Resource Network</p>
    </div>
  );
}
