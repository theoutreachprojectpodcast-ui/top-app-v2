"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OrganizationLogo from "@/components/shared/OrganizationLogo";
import { resolveSponsorDisplayName } from "@/lib/entityDisplayName";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";

function googleFaviconUrl(fromUrl) {
  try {
    const u = new URL(String(fromUrl || "").trim());
    if (!/^https?:$/i.test(u.protocol)) return "";
    const host = u.hostname.replace(/^www\./i, "");
    if (!host) return "";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
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
  if (type === "youtube") {
    return (
      <svg {...common} aria-hidden>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <path fill="currentColor" stroke="none" d="M9.75 15.02 15.5 11.75 9.75 8.48z" />
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

export default function FeaturedSponsorCard({
  sponsor,
  favoritesEnabled = false,
  isFavorite = false,
  onToggleFavorite,
  onRequestSignIn,
  hidePrimaryBadge = false,
}) {
  const router = useRouter();
  const [logoIndex, setLogoIndex] = useState(0);
  const warm = sponsor.warmVariant || "gold";
  const safeBg = sanitizeDisplayableImageUrl(String(sponsor.backgroundImageUrl || "").trim());
  const hasListingBg = !!safeBg;
  const displayName = resolveSponsorDisplayName(sponsor.name || "") || String(sponsor.name || "").trim() || "Partner";
  const logoCandidates = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (raw) => {
      const u = sanitizeDisplayableImageUrl(String(raw || "").trim());
      if (!u || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    push(sponsor.logoUrl);
    for (const extra of sponsor.logoFallbackUrls || []) push(extra);
    push(googleFaviconUrl(sponsor.ctaUrl));
    return out;
  }, [sponsor.logoUrl, sponsor.logoFallbackUrls, sponsor.ctaUrl]);
  const socialLinkItems = useMemo(() => {
    const social = sponsor.socialLinks || {};
    const out = [];
    const seen = new Set();
    const push = (key, raw) => {
      const u = sanitizeDisplayableImageUrl(String(raw || "").trim());
      if (!u || seen.has(u)) return;
      seen.add(u);
      out.push({ key, url: u });
    };
    const site = String(sponsor.ctaUrl || social.website || "").trim();
    if (site) push("website", site);
    const order = ["instagram", "facebook", "linkedin", "youtube", "twitter"];
    for (const key of order) {
      const raw = String(social[key] || "").trim();
      if (!raw) continue;
      push(key === "twitter" ? "x" : key, raw);
    }
    return out;
  }, [sponsor.ctaUrl, sponsor.socialLinks]);
  const logoSrc = logoCandidates[logoIndex] || "";
  const profileHref = `/sponsors/${encodeURIComponent(sponsor.slug || sponsor.id || "")}`;
  const favoriteKey = String(sponsor.slug || sponsor.id || "").trim().toLowerCase();
  const logoPanel =
    sponsor.logoPanelMode === "light"
      ? "light"
      : sponsor.logoPanelMode === "dark"
        ? "dark"
        : sponsor.logoPanelMode === "neutral"
          ? "neutral"
          : "auto";
  const accentStyle = sponsor.sponsorAccentColor
    ? { "--sponsor-card-accent": sponsor.sponsorAccentColor }
    : undefined;

  const tierClass = sponsor.displayGroup ? ` sponsorPremiumCard--displayTier-${sponsor.displayGroup}` : "";
  const showFavoriteControl = favoriteKey && (favoritesEnabled || onRequestSignIn);
  const showCardTop = !hidePrimaryBadge || showFavoriteControl;

  return (
    <article
      className={`torpListingCard sponsorPremiumCard sponsorPremiumCard--${warm}${tierClass}`}
      data-sponsor-slug={String(sponsor.slug || sponsor.id || "").trim().toLowerCase() || undefined}
      style={accentStyle}
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
      <div
        className="sponsorPremiumCardScrim"
        style={sponsor.cardScrimGradient ? { background: sponsor.cardScrimGradient } : undefined}
        aria-hidden
      />
      <div className="sponsorPremiumCardInner">
        {showCardTop ? (
          <div className="sponsorPremiumCardTop">
            {!hidePrimaryBadge ? (
              <div className="sponsorPremiumCardBadges" aria-label="Sponsor recognition">
                {sponsor.primaryBadge ? (
                  <span
                    className={`sponsorPremiumBadge sponsorPremiumBadge--primary sponsorPremiumBadge--${sponsor.primaryBadge.key}`}
                  >
                    {sponsor.primaryBadge.label}
                  </span>
                ) : null}
              </div>
            ) : null}
            {showFavoriteControl ? (
              <div className="sponsorPremiumCardTopActions">
                {favoritesEnabled ? (
                  <button
                    type="button"
                    className={`favBtn sponsorPremiumFavBtn${isFavorite ? " favBtn--on" : ""}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleFavorite?.(`sponsor:${favoriteKey}`);
                    }}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? "Remove sponsor from saved" : "Save sponsor"}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="favBtn favBtn--muted sponsorPremiumFavBtn"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRequestSignIn();
                    }}
                    aria-label="Sign in to save sponsor"
                  >
                    ☆
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="sponsorPremiumBrand">
          <div className="sponsorPremiumBrandIdentity">
            <OrganizationLogo
              src={logoSrc}
              alt=""
              name={displayName}
              entityKey={String(sponsor.slug || sponsor.id || "").trim().toLowerCase()}
              size="lg"
              surface="onDark"
              panel={logoPanel}
              onError={() => {
                if (logoIndex < logoCandidates.length - 1) setLogoIndex((v) => v + 1);
              }}
            />
            <div className="sponsorPremiumTitleBlock">
              <h4 className="sponsorPremiumOrgName">{displayName}</h4>
              {sponsor.cardSubheader ? <p className="sponsorPremiumSubheader">{sponsor.cardSubheader}</p> : null}
              {sponsor.industry || sponsor.tag ? (
                <div className="sponsorPremiumMetaChips">
                  {sponsor.industry ? <span className="sponsorPremiumMetaChip">{sponsor.industry}</span> : null}
                  {sponsor.tag && sponsor.tag !== sponsor.industry ? (
                    <span className="sponsorPremiumMetaChip sponsorPremiumMetaChip--muted">{sponsor.tag}</span>
                  ) : null}
                </div>
              ) : null}
              {Array.isArray(sponsor.locationChips) && sponsor.locationChips.length ? (
                <div className="sponsorPremiumLocationChips" aria-label="Locations">
                  {sponsor.locationChips.map((loc) => (
                    <span key={loc} className="sponsorPremiumLocationChip">
                      {loc}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {sponsor.tagline ? (
            <p className="sponsorPremiumTagline sponsorPremiumTagline--card">{sponsor.tagline}</p>
          ) : null}
        </div>
        <div className="sponsorPremiumFooter">
          {sponsor.ctaUrl && !sponsor.websitePending ? (
            <a
              className="btnSoft sponsorPremiumVisitBtn"
              href={sponsor.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {sponsor.ctaLabel || "Visit Website"}
            </a>
          ) : null}
          <div className="sponsorPremiumSocial" aria-label="Sponsor website and social profiles">
            {socialLinkItems.map(({ key, url }) => (
              <a
                key={`${key}-${url}`}
                className="sponsorPremiumSocialLink"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  key === "website" ? `${displayName} website` : `${displayName} on ${key === "x" ? "X" : key}`
                }
                onClick={(event) => event.stopPropagation()}
              >
                <SocialIcon type={key} />
              </a>
            ))}
          </div>
          {sponsor.websitePending || !sponsor.ctaUrl ? (
            <span className="sponsorPremiumPending">Website pending</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
