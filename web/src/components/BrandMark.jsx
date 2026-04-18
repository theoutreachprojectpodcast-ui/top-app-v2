"use client";

/** Committed under `web/public/`. Override with `NEXT_PUBLIC_BRAND_LOGO_PATH` or `src`. */
const DEFAULT_LOGO = "/brand-logo-site.png";

export default function BrandMark({
  size = "header",
  className = "",
  alt = "The Outreach Project",
  src,
}) {
  const logoSrc = src || (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BRAND_LOGO_PATH) || DEFAULT_LOGO;
  const variantClass = size === "header" ? "brandMarkImg--header" : `brandMarkImg--${size}`;
  return (
    <img
      src={logoSrc}
      alt={alt}
      decoding="async"
      fetchPriority={size === "header" ? "high" : "auto"}
      className={`brandMarkImg ${variantClass} ${className}`.trim()}
    />
  );
}
