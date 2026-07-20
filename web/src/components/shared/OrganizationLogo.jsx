"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assessLogoPresentationFromElement,
  getCachedLogoPresentation,
  setCachedLogoPresentation,
} from "@/lib/media/assessLogoPresentation";
import { getLogoPresentationOverride, mergeLogoPresentation } from "@/lib/media/logoPresentationOverrides";
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

const DEFAULT_PRESENTATION = {
  bgColor: "",
  pad: 8,
  scale: 1,
  fit: "contain",
  tone: "normal",
  borderColor: "",
  minimalFrame: false,
  frameShape: "circle",
  panel: "auto",
  focusX: 50,
  focusY: 50,
};

function resolveManual(presentation, entityKey, logoSrc) {
  return presentation || getLogoPresentationOverride(entityKey, logoSrc);
}

/**
 * Circular 1:1 organization logo with per-mark matte color, padding, and framing.
 */
export default function OrganizationLogo({
  src = "",
  alt = "",
  name = "",
  entityKey = "",
  size = "card",
  surface = "default",
  panel = "auto",
  detectTone = true,
  presentation = null,
  fallback = "initials",
  fallbackIcon = null,
  onError,
  className = "",
  frameClassName = "",
}) {
  const logoSrc = String(src || "").trim();

  const [mark, setMark] = useState(() => {
    const cached = getCachedLogoPresentation(logoSrc);
    const manual = resolveManual(presentation, entityKey, logoSrc);
    if (!cached) return mergeLogoPresentation(manual, DEFAULT_PRESENTATION, { panel, surface });
    return mergeLogoPresentation(manual, cached, { panel, surface });
  });

  useEffect(() => {
    const cached = getCachedLogoPresentation(logoSrc);
    const manual = resolveManual(presentation, entityKey, logoSrc);
    if (cached) {
      setMark(mergeLogoPresentation(manual, cached, { panel, surface }));
      return;
    }
    setMark(mergeLogoPresentation(manual, DEFAULT_PRESENTATION, { panel, surface }));
  }, [logoSrc, entityKey, panel, surface, presentation]);

  const rootClass = [
    "organizationLogo",
    SIZE_CLASS[size] || SIZE_CLASS.card,
    SURFACE_CLASS[surface] || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const frameClass = [
    "organizationLogo__frame",
    mark.bgColor ? "organizationLogo__frame--matte" : "",
    mark.minimalFrame ? "organizationLogo__frame--minimal" : "",
    mark.frameShape === "rounded" ? "organizationLogo__frame--rounded" : "",
    frameClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const frameStyle = useMemo(() => {
    const style = {};
    if (mark.bgColor) style.backgroundColor = mark.bgColor;
    if (mark.borderColor) style.borderColor = mark.borderColor;
    return style;
  }, [mark.bgColor, mark.borderColor]);

  const insetStyle = useMemo(
    () => ({
      padding: `${mark.pad ?? 8}%`,
    }),
    [mark.pad],
  );

  const imgClass = [
    "organizationLogo__img",
    mark.fit === "cover" ? "organizationLogo__img--cover" : "organizationLogo__img--contain",
  ].join(" ");

  const imgStyle = useMemo(() => {
    const scale = mark.scale && mark.scale !== 1 ? mark.scale : 1;
    const focusX = mark.focusX ?? 50;
    const focusY = mark.focusY ?? 50;
    return {
      width: scale !== 1 ? `${scale * 100}%` : undefined,
      height: scale !== 1 ? `${scale * 100}%` : undefined,
      objectPosition: `${focusX}% ${focusY}%`,
    };
  }, [mark.scale, mark.focusX, mark.focusY]);

  function onLogoLoad(event) {
    if (!logoSrc || !detectTone) return;
    const manual = resolveManual(presentation, entityKey, logoSrc);
    const cached = getCachedLogoPresentation(logoSrc);
    const assessed = cached || assessLogoPresentationFromElement(event.currentTarget, { surface });
    if (!cached) setCachedLogoPresentation(logoSrc, assessed);
    setMark(mergeLogoPresentation(manual, assessed, { panel, surface }));
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
      <span className={frameClass} style={frameStyle}>
        {logoSrc ? (
          <span className="organizationLogo__inset" style={insetStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={imgClass}
              src={logoSrc}
              alt={alt}
              loading="lazy"
              decoding="async"
              style={imgStyle}
              onLoad={onLogoLoad}
              onError={(event) => {
                setMark(mergeLogoPresentation(presentation, DEFAULT_PRESENTATION, { panel, surface }));
                onError?.(event);
              }}
            />
          </span>
        ) : (
          renderFallback()
        )}
      </span>
    </span>
  );
}
