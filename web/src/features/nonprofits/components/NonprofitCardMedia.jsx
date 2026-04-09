"use client";

import { useMemo, useState } from "react";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";

const toneCache = new Map();

function assessLogoToneFromElement(imgEl) {
  try {
    const w = Math.min(72, imgEl.naturalWidth || 72);
    const h = Math.min(72, imgEl.naturalHeight || 72);
    if (!w || !h) return "unknown";
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "unknown";
    ctx.drawImage(imgEl, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let count = 0;
    let opaque = 0;
    let lumaSum = 0;
    let satSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      if (a < 0.2) continue;
      opaque += 1;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      satSum += sat;
      lumaSum += luma;
      count += 1;
    }
    if (!count || opaque / ((w * h) || 1) < 0.08) return "unknown";
    const avgLuma = lumaSum / count;
    const avgSat = satSum / count;
    // Very conservative classification to avoid damaging colored/brand logos.
    if (avgLuma >= 0.94 && avgSat <= 0.06) return "lightmono";
    if (avgLuma <= 0.1 && avgSat <= 0.06) return "darkmono";
    return "normal";
  } catch {
    // Cross-origin logos may block canvas reads; fall back gracefully.
    return "unknown";
  }
}

export default function NonprofitCardMedia({ category, tier, logoUrl, layout = "default" }) {
  const tint = category?.tint || "var(--color-accent-soft)";
  const url = String(logoUrl || "").trim();
  const showLogo = layout === "proven" && !!url;
  const isFeatured = tier === "featured";
  const [logoTone, setLogoTone] = useState(() => toneCache.get(url) || "unknown");
  const toneClass = useMemo(
    () => (showLogo ? ` nonprofitLogoImg--tone-${logoTone}` : ""),
    [showLogo, logoTone]
  );

  function onLogoLoad(event) {
    if (!url) return;
    if (toneCache.has(url)) {
      setLogoTone(toneCache.get(url));
      return;
    }
    const tone = assessLogoToneFromElement(event.currentTarget);
    toneCache.set(url, tone);
    setLogoTone(tone);
  }

  return (
    <div className={`nonprofitCardMedia${layout === "proven" ? " nonprofitCardMedia--proven" : ""}`}>
      <div
        className={`nonprofitIconBadge${showLogo ? " nonprofitIconBadge--logo" : ""}`}
        title={category?.label || "General Nonprofit"}
        style={{ "--nonprofit-icon-tint": tint }}
      >
        {showLogo ? (
          <span className="nonprofitLogoPlate" aria-hidden="true">
            <img
              className={`nonprofitLogoImg${toneClass}`}
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={onLogoLoad}
            />
          </span>
        ) : (
          <NonprofitIcon category={category} size={layout === "proven" ? 30 : 28} variant={isFeatured ? "featured" : "default"} />
        )}
      </div>
    </div>
  );
}
