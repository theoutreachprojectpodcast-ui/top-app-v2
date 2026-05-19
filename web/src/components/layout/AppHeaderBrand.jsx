"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { useColorScheme } from "@/components/app/ColorSchemeRoot";
import { resolvePodcastBrandLogoSrc } from "@/lib/podcast/podcastBrandLogo";

/**
 * OP / TOP header brand (required site chrome).
 *
 * Do not remove or gate behind breakpoints during responsive refactors — mobile stacks this row
 * above `.topbar` / `.subpageTopbar` (see `top-app.css` @media max-width 760px). The logo must stay
 * visible for logged-in/out, menu open/closed, and sub-routes (home, sponsors, podcasts, trusted, profile, admin).
 */
export default function AppHeaderBrand({
  homeHref = "/",
  ariaLabel = "Go to home",
  brandSrc,
  brandAlt = "The Outreach Project",
  brandClassName = "",
}) {
  const { colorScheme } = useColorScheme();
  const isPodcastMark = String(brandClassName || "").includes("podcastBrandLogo");
  const resolvedSrc = isPodcastMark ? resolvePodcastBrandLogoSrc(colorScheme) : brandSrc || undefined;

  return (
    <div className="headerBrandStack" data-torp-header-brand="1">
      <Link href={homeHref} aria-label={ariaLabel}>
        <BrandMark size="header" src={resolvedSrc} alt={brandAlt} className={brandClassName} />
      </Link>
    </div>
  );
}
