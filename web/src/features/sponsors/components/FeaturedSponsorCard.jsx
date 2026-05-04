"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveSponsorDisplayName } from "@/lib/entityDisplayName";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";

const toneCache = new Map();

function assessLogoToneFromElement(imgEl) {
  if (!imgEl?.naturalWidth || !imgEl?.naturalHeight) return "normal";
  const canvas = document.createElement("canvas");
  canvas.width = 30;
  canvas.height = 30;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "normal";

  try {
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let samples = 0;
    let lumaSum = 0;
    let satSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.28) continue;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      samples += 1;
      lumaSum += luma;
      satSum += sat;
    }

    if (!samples) return "normal";
    const avgLuma = lumaSum / samples;
    const avgSat = satSum / samples;

    if (avgLuma >= 0.9 && avgSat <= 0.11) return "lightmono";
    if (avgLuma <= 0.16 && avgSat <= 0.15) return "darkmono";
    return "normal";
  } catch {
    return "normal";
  }
}

function SocialIcon({ type }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  if (type === "linkedin") {
    return (
      <svg {...common} aria-hidden>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (type === "instagram") {
    return (
      <svg {...common} aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "website") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }
  if (type === "facebook") {
    return (
      <svg {...common} aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (type === "x") {
    return (
      <svg {...common} aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20" />
    </svg>
  );
}

export default function FeaturedSponsorCard({ sponsor }) {
  const router = useRouter();
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoTone, setLogoTone] = useState("normal");
  const warm = sponsor.warmVariant || "gold";
  const safeBg = sanitizeDisplayableImageUrl(String(sponsor.backgroundImageUrl || "").trim());
  const hasListingBg = !!safeBg;
  const social = sponsor.socialLinks || {};
  const displayName = resolveSponsorDisplayName(sponsor.name || "") || String(sponsor.name || "").trim() || "Partner";
  const logoCandidates = useMemo(() => {
    const u = sanitizeDisplayableImageUrl(String(sponsor.logoUrl || "").trim());
    return u ? [u] : [];
  }, [sponsor.logoUrl]);
  const logoSrc = logoCandidates[logoIndex] || "";
  const profileHref = `/sponsors/${encodeURIComponent(sponsor.slug || sponsor.id || "")}`;
  const logoToneClass = logoTone === "normal" ? "" : ` sponsorPremiumLogoImg--tone-${logoTone}`;
  const shellToneClass = logoTone === "normal" ? "" : ` sponsorPremiumLogoShell--tone-${logoTone}`;

  return (
    <article
      className={`torpListingCard sponsorPremiumCard sponsorPremiumCard--${warm}`}
      role="button"
      tabIndex={0}
      onClick={() => router.push(profileHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(profileHref);
        }
      }}
      aria-label={`Open ${displayName} sponsor profile`}
    >
      <div
        className={`sponsorPremiumCardBg torpListingCardHero ${hasListingBg ? "torpListingCardHero--photo" : `torpListingCardHero--sponsorTone torpListingCardHero--sponsorTone-${warm}`}`}
        style={hasListingBg ? { backgroundImage: `url('${safeBg.replace(/'/g, "%27")}')` } : undefined}
        aria-hidden
      />
      <div className="sponsorPremiumCardScrim" aria-hidden />
      <div className="sponsorPremiumCardInner">
        <div className="sponsorPremiumCardTop">
          <span className="sponsorPremiumTier">{sponsor.tierLabel || "Partner"}</span>
          <span className="sponsorPremiumTag">{sponsor.tag || "Mission-aligned"}</span>
        </div>
        <div className="sponsorPremiumBrand">
          <div className={`sponsorPremiumLogoShell${shellToneClass}`}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={`sponsorPremiumLogoImg${logoToneClass}`}
                src={logoSrc}
                alt=""
                loading="lazy"
                onLoad={(event) => {
                  if (toneCache.has(logoSrc)) {
                    setLogoTone(toneCache.get(logoSrc));
                    return;
                  }
                  const tone = assessLogoToneFromElement(event.currentTarget);
                  toneCache.set(logoSrc, tone);
                  setLogoTone(tone);
                }}
                onError={() => {
                  if (logoIndex < logoCandidates.length - 1) {
                    setLogoIndex((v) => v + 1);
                    setLogoTone("normal");
                    return;
                  }
                  setLogoTone("normal");
                }}
              />
            ) : (
              <span className="sponsorPremiumWordmark">{displayName}</span>
            )}
          </div>
          <div className="sponsorPremiumCopy">
            <h4>{displayName}</h4>
            {sponsor.cardSubheader ? <p className="sponsorPremiumSubheader">{sponsor.cardSubheader}</p> : null}
            {sponsor.industry ? <p className="sponsorPremiumIndustry">{sponsor.industry}</p> : null}
            <p className="sponsorPremiumTagline">{sponsor.tagline || "Partner supporting service communities."}</p>
            <div className="sponsorPremiumFooter">
              <div className="sponsorPremiumSocial" aria-label="Sponsor links">
                {sponsor.ctaUrl && !sponsor.websitePending ? (
                  <a
                    className="sponsorPremiumSocialLink"
                    href={sponsor.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${displayName} website`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <SocialIcon type="website" />
                  </a>
                ) : null}
                {Object.entries(social).map(([key, url]) => {
                  if (!url || key === "website") return null;
                  return (
                    <a
                      key={key}
                      className="sponsorPremiumSocialLink"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${displayName} on ${key}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <SocialIcon type={key === "twitter" ? "x" : key} />
                    </a>
                  );
                })}
              </div>
              {sponsor.websitePending || !sponsor.ctaUrl ? (
                <span className="sponsorPremiumPending">{sponsor.ctaLabel || "Website pending"}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
