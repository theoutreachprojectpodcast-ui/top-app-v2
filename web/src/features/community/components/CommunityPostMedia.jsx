"use client";

import { useState } from "react";

const FALLBACK_IMAGE = "/home/home-trusted-mountain.png";

/** Brand marks ship on transparent/dark art — show on a black plate, not gray card fill. */
export function isBrandLogoCommunityMedia(src) {
  const path = String(src || "").trim().split("?")[0].toLowerCase();
  return path.includes("/brand-logo");
}

/**
 * Cover media with same-origin or remote src and a stable fallback.
 * @param {{ src: string, alt: string, className?: string, priority?: boolean }}
 */
export default function CommunityPostMedia({ src, alt, className = "", priority = false }) {
  const initial = String(src || "").trim() || FALLBACK_IMAGE;
  const [url, setUrl] = useState(initial);
  const safeAlt = String(alt || "Community post image").trim() || "Community post image";
  const onBlackPlate = isBrandLogoCommunityMedia(initial) || isBrandLogoCommunityMedia(url);

  return (
    <div
      className={`communityPostMedia${onBlackPlate ? " communityPostMedia--onBlack" : ""}${className ? ` ${className}` : ""}`}
    >
      <img
        src={url}
        alt={safeAlt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={1200}
        height={675}
        onError={() => {
          if (url !== FALLBACK_IMAGE) setUrl(FALLBACK_IMAGE);
        }}
      />
    </div>
  );
}
