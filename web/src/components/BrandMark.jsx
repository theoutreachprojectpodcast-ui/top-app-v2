"use client";

import Image from "next/image";

const PROFILE_PX = 44;

/** Synced from repo `assets/brand-logo-full.png`. Override with `NEXT_PUBLIC_BRAND_LOGO_PATH` or `src`. */
const DEFAULT_LOGO = "/assets/brand-logo-full.png";

export default function BrandMark({
  size = "header",
  className = "",
  alt = "The Outreach Project",
  src,
}) {
  const logoSrc = src || (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BRAND_LOGO_PATH) || DEFAULT_LOGO;

  if (size === "header") {
    return (
      <div className={`brandMark brandMark-header ${className}`.trim()}>
        <Image
          src={logoSrc}
          alt={alt}
          width={512}
          height={512}
          priority
          className="brandMarkImg brandMarkImg--header"
          sizes="(max-width: 760px) 180px, 240px"
        />
      </div>
    );
  }

  const px = PROFILE_PX;
  return (
    <div className={`brandMark brandMark-${size} brandMarkFrame ${className}`.trim()} style={{ width: px, height: px }}>
      <div className="brandMarkInner">
        <Image src={logoSrc} alt={alt} fill sizes={`${px}px`} className="brandMarkImg" />
      </div>
    </div>
  );
}
