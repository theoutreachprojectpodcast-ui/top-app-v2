"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import BrandMark from "@/components/BrandMark";
import { useColorScheme } from "@/components/app/ColorSchemeRoot";
import { resolvePodcastBrandLogoSrc } from "@/lib/podcast/podcastBrandLogo";

const MOBILE_HEADER_MQ = "(max-width: 760px)";

function subscribeMobileHeader(onStoreChange) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MOBILE_HEADER_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileHeaderSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_HEADER_MQ).matches;
}

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
  compactMark = false,
}) {
  const { colorScheme } = useColorScheme();
  const mobileHeader = useSyncExternalStore(subscribeMobileHeader, getMobileHeaderSnapshot, () => false);
  const isPodcastMark = String(brandClassName || "").includes("podcastBrandLogo");
  const resolvedSrc = isPodcastMark ? resolvePodcastBrandLogoSrc(colorScheme) : brandSrc || undefined;
  /* Full wordmark on mobile — mark assets crop “PROJECT” when height-capped. */
  const useMobileFullWordmark = mobileHeader && !compactMark && !isPodcastMark && !brandSrc;
  const markVariant = compactMark && !isPodcastMark ? "mark" : "full";

  return (
    <div
      className={`headerBrandStack${useMobileFullWordmark ? " headerBrandStack--mobileWordmark" : ""}${compactMark ? " headerBrandStack--compactMark" : ""}`.trim()}
      data-torp-header-brand="1"
    >
      <Link href={homeHref} aria-label={ariaLabel}>
        <BrandMark
          size="header"
          variant={markVariant}
          src={resolvedSrc}
          alt={brandAlt}
          className={brandClassName}
        />
      </Link>
    </div>
  );
}
