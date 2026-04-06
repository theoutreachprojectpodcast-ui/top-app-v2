"use client";

import { useColorScheme } from "@/components/app/ColorSchemeRoot";

const DEFAULT_LOGO_DARK = "/brand-logo-site-dark.png";
const DEFAULT_LOGO_LIGHT = "/brand-logo-site-light.png";
const DEFAULT_MARK_DARK = "/brand-logo-mark-dark.png";
const DEFAULT_MARK_LIGHT = "/brand-logo-mark-light.png";

/** Committed under `web/public/`. Override with `NEXT_PUBLIC_BRAND_LOGO_PATH` or `src`. */
export default function BrandMark({
  size = "header",
  className = "",
  alt = "The Outreach Project",
  src,
  variant = "full",
}) {
  const { colorScheme } = useColorScheme();
  const isLight = colorScheme === "light";

  const envOverride = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BRAND_LOGO_PATH : "";
  const logoSrc = src || envOverride || (variant === "mark"
    ? (isLight ? DEFAULT_MARK_LIGHT : DEFAULT_MARK_DARK)
    : (isLight ? DEFAULT_LOGO_LIGHT : DEFAULT_LOGO_DARK));

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
