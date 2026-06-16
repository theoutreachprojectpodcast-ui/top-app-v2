"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assessLogoToneFromElement,
  getCachedLogoTone,
  setCachedLogoTone,
} from "@/lib/media/assessLogoTone";
import { organizationInitials } from "@/lib/media/organizationInitials";

const SIZE_CLASS = {
  xs: "organizationLogo--xs",
  sm: "organizationLogo--sm",
  md: "organizationLogo--md",
  card: "organizationLogo--card",
  profile: "organizationLogo--profile",
  lg: "organizationLogo--lg",
  banner: "organizationLogo--banner",
};

const SURFACE_CLASS = {
  default: "",
  onDark: "organizationLogo--onDark",
  page: "organizationLogo--page",
};

/**
 * Circular 1:1 organization logo with optional tone-aware shell and initials fallback.
 *
 * @param {{
 *   src?: string,
 *   alt?: string,
 *   name?: string,
 *   size?: keyof typeof SIZE_CLASS,
 *   surface?: keyof typeof SURFACE_CLASS,
 *   panel?: "auto" | "light" | "dark" | null,
 *   detectTone?: boolean,
 *   fallback?: "initials" | "icon" | import("react").ReactNode,
 *   fallbackIcon?: import("react").ReactNode,
 *   onError?: (event: import("react").SyntheticEvent<HTMLImageElement>) => void,
 *   className?: string,
 *   frameClassName?: string,
 * }} props
 */
export default function OrganizationLogo({
  src = "",
  alt = "",
  name = "",
  size = "card",
  surface = "default",
  panel = "auto",
  detectTone = true,
  fallback = "initials",
  fallbackIcon = null,
  onError,
  className = "",
  frameClassName = "",
}) {
  const logoSrc = String(src || "").trim();
  const [logoTone, setLogoTone] = useState(() => getCachedLogoTone(logoSrc) || "normal");

  useEffect(() => {
    setLogoTone(getCachedLogoTone(logoSrc) || "normal");
  }, [logoSrc]);

  const useLightPanel = panel === "light";
  const lockDarkPanel = panel === "dark";
  const toneActive = panel === "auto" && detectTone && logoSrc;

  const frameToneClass = useMemo(() => {
    if (useLightPanel) return " organizationLogo__frame--panel-light";
    if (lockDarkPanel || !toneActive || logoTone === "normal") return "";
    return ` organizationLogo__frame--tone-${logoTone}`;
  }, [useLightPanel, lockDarkPanel, toneActive, logoTone]);

  const imgToneClass = useMemo(() => {
    if (useLightPanel || lockDarkPanel || !toneActive || logoTone === "normal") return "";
    return ` organizationLogo__img--tone-${logoTone}`;
  }, [useLightPanel, lockDarkPanel, toneActive, logoTone]);

  const rootClass = [
    "organizationLogo",
    SIZE_CLASS[size] || SIZE_CLASS.card,
    SURFACE_CLASS[surface] || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const frameClass = `organizationLogo__frame${frameToneClass}${frameClassName ? ` ${frameClassName}` : ""}`;

  function onLogoLoad(event) {
    if (!logoSrc || !detectTone || panel !== "auto") return;
    const cached = getCachedLogoTone(logoSrc);
    if (cached) {
      setLogoTone(cached);
      return;
    }
    const tone = assessLogoToneFromElement(event.currentTarget);
    setCachedLogoTone(logoSrc, tone);
    setLogoTone(tone);
  }

  function renderFallback() {
    if (fallback && typeof fallback !== "string") return fallback;
    if (fallback === "icon" && fallbackIcon) {
      return <span className="organizationLogo__fallbackIcon">{fallbackIcon}</span>;
    }
    return <span className="organizationLogo__fallback">{organizationInitials(name)}</span>;
  }

  return (
    <span className={rootClass}>
      <span className={frameClass}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={`organizationLogo__img${imgToneClass}`}
            src={logoSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={onLogoLoad}
            onError={(event) => {
              setLogoTone("normal");
              onError?.(event);
            }}
          />
        ) : (
          renderFallback()
        )}
      </span>
    </span>
  );
}
