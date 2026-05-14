"use client";

import Link from "next/link";
import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";

function pickFeatured(id) {
  return FEATURED_SPONSORS.find((s) => s.id === id) || null;
}

function SponsorHomePlacement({ sponsor }) {
  if (!sponsor) return null;
  const logo = String(sponsor.logoUrl || "").trim();
  const photo = String(sponsor.backgroundImageUrl || "").trim();
  const brandStack = !!logo && !!photo;
  const logoOnly = !!logo && !photo;

  return (
    <Link
      className={`homeSponsorBannerSlot${brandStack ? " homeSponsorBannerSlot--brandStack" : ""}${logoOnly ? " homeSponsorBannerSlot--logo" : ""}`}
      href={`/sponsors/${sponsor.id}`}
    >
      {brandStack ? (
        <>
          <span
            className="homeSponsorBannerSlot__bg"
            style={{ backgroundImage: `url(${photo})` }}
            aria-hidden
          />
        </>
      ) : logoOnly ? (
        <img className="homeSponsorBannerSlot__logo" src={logo} alt="" loading="lazy" />
      ) : (
        <span
          className="homeSponsorBannerSlot__bg"
          style={{ backgroundImage: photo ? `url(${photo})` : undefined }}
          aria-hidden
        />
      )}
      <span
        className={`homeSponsorBannerSlot__scrim${
          brandStack ? " homeSponsorBannerSlot__scrim--brandStack" : logoOnly ? " homeSponsorBannerSlot__scrim--logo" : ""
        }`}
        aria-hidden
      />
      {brandStack ? (
        <span className="homeSponsorBannerSlot__content homeSponsorBannerSlot__content--brandStack">
          <span className="homeSponsorBannerSlot__brandPlate" aria-hidden>
            <img className="homeSponsorBannerSlot__brandMark" src={logo} alt="" loading="lazy" />
          </span>
          <span className="homeSponsorBannerSlot__textStack">
            <span className="homeSponsorBannerSlot__eyebrow">Sponsor</span>
            <span className="homeSponsorBannerSlot__title">{sponsor.name}</span>
          </span>
        </span>
      ) : (
        <span className="homeSponsorBannerSlot__content">
          <span className="homeSponsorBannerSlot__eyebrow">Sponsor</span>
          <span className="homeSponsorBannerSlot__title">{sponsor.name}</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Three home placements: two spotlight sponsors + one reserved slot (links to apply).
 * When a sponsor has both `logoUrl` and `backgroundImageUrl`, the tile uses a photo fill with the mark in a
 * frosted bottom bar beside the title (not floating over the hero).
 * Logo-only tiles use a neutral panel; photo-only tiles use full-bleed photography.
 */
export default function HomeSponsorBannerPlacements() {
  const gameday = pickFeatured("gameday-mens-health");
  const rope = pickFeatured("rope-solutions");

  return (
    <aside className="homeSponsorBannerRow" aria-label="Sponsor placements">
      <SponsorHomePlacement sponsor={gameday} />
      <SponsorHomePlacement sponsor={rope} />
      <Link className="homeSponsorBannerSlot homeSponsorBannerSlot--placeholder" href="/sponsors/apply">
        <span className="homeSponsorBannerSlot__scrim homeSponsorBannerSlot__scrim--muted" aria-hidden />
        <span className="homeSponsorBannerSlot__content">
          <span className="homeSponsorBannerSlot__eyebrow">Available</span>
          <span className="homeSponsorBannerSlot__title">Partner placement</span>
          <span className="homeSponsorBannerSlot__hint">Reserve this spotlight — apply to sponsor</span>
        </span>
      </Link>
    </aside>
  );
}
