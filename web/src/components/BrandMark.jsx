"use client";

import Image from "next/image";

const SIZE_MAP = {
  header: 88,
  profile: 44,
};

/** Default logo; drop `public/assets/brand-anchor.png` (synced from repo `assets/`) or set NEXT_PUBLIC_BRAND_LOGO_PATH. */
const DEFAULT_LOGO = "/assets/op-logo-silver.png";

export default function BrandMark({
  size = "header",
  className = "",
  alt = "The Outreach Project",
  src,
}) {
  const px = SIZE_MAP[size] || SIZE_MAP.header;
  const logoSrc = src || (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BRAND_LOGO_PATH) || DEFAULT_LOGO;

  return (
    <div
      className={`brandMark brandMark-${size} brandMarkFrame ${className}`.trim()}
      style={{ width: px, height: px }}
    >
      <div className="brandMarkInner">
        <Image
          src={logoSrc}
          alt={alt}
          fill
          sizes={`${px}px`}
          className="brandMarkImg"
          priority={size === "header"}
        />
      </div>
    </div>
  );
}
