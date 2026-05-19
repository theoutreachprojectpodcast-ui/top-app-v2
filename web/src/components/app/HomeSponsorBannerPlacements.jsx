"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURED_SPONSORS } from "@/features/sponsors/data/featuredSponsors";
import "./home-sponsor-banner.css";

const MOBILE_CAROUSEL_MQ = "(max-width: 760px)";
const CAROUSEL_INTERVAL_MS = 3000;

function pickFeatured(id) {
  return FEATURED_SPONSORS.find((s) => s.id === id) || null;
}

function sponsorEyebrow(sponsor) {
  return String(sponsor.primaryDisplayTag || sponsor.tag || "Sponsor").trim();
}

function sponsorTagline(sponsor) {
  return String(sponsor.subtitle || sponsor.tagline || "").trim();
}

function SponsorHomePlacement({ sponsor }) {
  if (!sponsor) return null;
  const logo = String(sponsor.logoUrl || "").trim();
  const photo = String(sponsor.backgroundImageUrl || "").trim();
  const hasLogo = !!logo;
  const hasPhoto = !!photo;
  const eyebrow = sponsorEyebrow(sponsor);
  const tagline = sponsorTagline(sponsor);

  const isGameday = sponsor.id === "gameday-mens-health";

  return (
    <Link
      className={`homeSponsorBannerSlot${hasPhoto ? " homeSponsorBannerSlot--photo" : ""}${hasLogo ? " homeSponsorBannerSlot--hasLogo" : ""}${isGameday ? " homeSponsorBannerSlot--gameday" : ""}`}
      href={`/sponsors/${sponsor.id}`}
    >
      {hasPhoto ? (
        <span className="homeSponsorBannerSlot__bg" style={{ backgroundImage: `url(${photo})` }} aria-hidden />
      ) : null}
      <span
        className={`homeSponsorBannerSlot__scrim${hasPhoto ? " homeSponsorBannerSlot__scrim--photo" : ""}`}
        aria-hidden
      />
      <div className="homeSponsorBannerSlot__brandRow">
        {hasLogo ? (
          <div className="homeSponsorBannerSlot__logoCell">
            <img className="homeSponsorBannerSlot__logoFloat" src={logo} alt="" loading="lazy" decoding="async" />
          </div>
        ) : null}
        <div className="homeSponsorBannerSlot__detailsCell">
          <span className="homeSponsorBannerSlot__eyebrow">{eyebrow}</span>
          <span className="homeSponsorBannerSlot__title">{sponsor.name}</span>
          {tagline ? <span className="homeSponsorBannerSlot__tagline">{tagline}</span> : null}
          <span className="homeSponsorBannerSlot__cta">View partner</span>
        </div>
      </div>
    </Link>
  );
}

/** Home spotlight sponsor slugs (order preserved in the row / carousel). */
const HOME_SPONSOR_SPOTLIGHT_IDS = ["gameday-mens-health", "rope-solutions", "apex-global-outdoors"];

/**
 * Home sponsor spotlight row: featured partners only.
 * Logo left (transparent PNG, no plate), partner details right. Photo tiles use full-bleed backgrounds.
 */
export default function HomeSponsorBannerPlacements() {
  const spotlightSponsors = HOME_SPONSOR_SPOTLIGHT_IDS.map(pickFeatured).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchDepthRef = useRef(0);
  const count = spotlightSponsors.length;

  const pauseCarousel = useCallback(() => {
    setPaused(true);
  }, []);

  const resumeCarousel = useCallback(() => {
    setPaused(false);
  }, []);

  const onTouchStart = useCallback(() => {
    touchDepthRef.current += 1;
    pauseCarousel();
  }, [pauseCarousel]);

  const onTouchEnd = useCallback(() => {
    touchDepthRef.current = Math.max(0, touchDepthRef.current - 1);
    if (touchDepthRef.current === 0) resumeCarousel();
  }, [resumeCarousel]);

  useEffect(() => {
    if (count <= 1) return undefined;
    if (paused) return undefined;

    const mobileMq = window.matchMedia(MOBILE_CAROUSEL_MQ);
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const tick = () => {
      if (!mobileMq.matches || reducedMotionMq.matches) return;
      setActiveIndex((i) => (i + 1) % count);
    };

    if (!mobileMq.matches || reducedMotionMq.matches) return undefined;

    const id = window.setInterval(tick, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  return (
    <section
      className="homeSponsorSpotlights"
      aria-label="Featured sponsors"
      data-home-sponsor-layout="logo-left-v2"
    >
      <header className="homeSponsorSpotlights__head">
        <p className="homeSponsorSpotlights__eyebrow">Mission partners</p>
        <h2 className="homeSponsorSpotlights__title">Featured sponsors</h2>
      </header>
      <div
        className="homeSponsorBannerRow homeSponsorBannerRow--switcher"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured sponsor partners"
        onPointerDown={pauseCarousel}
        onPointerUp={resumeCarousel}
        onPointerCancel={resumeCarousel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onFocusCapture={pauseCarousel}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) resumeCarousel();
        }}
      >
        {spotlightSponsors.map((sponsor, index) => (
          <div
            key={sponsor.id}
            className={`homeSponsorBannerCarouselSlide${index === activeIndex ? " isActive" : ""}`}
            aria-hidden={index !== activeIndex ? true : undefined}
          >
            <SponsorHomePlacement sponsor={sponsor} />
          </div>
        ))}
      </div>
      {count > 1 ? (
        <p className="homeSponsorBannerCarouselStatus" aria-live="polite">
          Showing sponsor {activeIndex + 1} of {count}
        </p>
      ) : null}
    </section>
  );
}
