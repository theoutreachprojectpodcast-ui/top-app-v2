"use client";

import Image from "next/image";

const PROFILE_PX = 44;

/** Committed under `web/public/`. Override with `NEXT_PUBLIC_BRAND_LOGO_PATH` or `src`. */
const DEFAULT_LOGO = "/brand-logo-full.png";

export default function BrandMark({
  size = "header",
  className = "",
  alt = "The Outreach Project",
  src,
}) {
  const logoSrc = src || (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BRAND_LOGO_PATH) || DEFAULT_LOGO;

  if (size === "header") {
    return (
      <img
        src={logoSrc}
        alt={alt}
        width={768}
        height={768}
        decoding="async"
        fetchPriority="high"
        className={`brandMarkImg brandMarkImg--header ${className}`.trim()}
      />
    );
  }

  const px = PROFILE_PX;
  return (
    <div className={`brandMark brandMark-${size} brandMarkFrame ${className}`.trim()} style={{ width: px, height: px }}>
      <div className="brandMarkInner">
        <Image src={logoSrc} alt={alt} fill sizes={`${px}px`} className="brandMarkImg" unoptimized />
      </div>
    </div>
  );
}
