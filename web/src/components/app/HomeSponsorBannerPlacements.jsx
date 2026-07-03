"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import OrganizationLogo from "@/components/shared/OrganizationLogo";
import { getHomepageFeaturedSponsorSeed } from "@/lib/sponsors/homepageFeaturedSponsors";
import { canonicalSponsorHubSlug } from "@/features/sponsors/api/sponsorCatalogApi";
import "./home-sponsor-banner.css";

const MOBILE_CAROUSEL_MQ = "(max-width: 760px)";

function sponsorEyebrow(sponsor) {
  return String(sponsor.primaryDisplayTag || sponsor.tag || "Mission Partner").trim();
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
  const slug = canonicalSponsorHubSlug(String(sponsor.slug || sponsor.id || "").trim());
  const profileHref = slug ? `/sponsors/${encodeURIComponent(slug)}` : "/sponsors";
  const isGameday = slug === "gameday-mens-health";

  return (
    <Link
      className={`homeSponsorBannerSlot${hasPhoto ? " homeSponsorBannerSlot--photo" : ""}${hasLogo ? " homeSponsorBannerSlot--hasLogo" : ""}${isGameday ? " homeSponsorBannerSlot--gameday" : ""}`}
      href={profileHref}
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
            <OrganizationLogo
              src={logo}
              alt=""
              name={sponsor.name}
              entityKey={slug}
              size="banner"
              surface="onDark"
              panel="auto"
            />
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

/**
 * Home Mission Partners spotlight — loads from `sponsors_catalog` via `/api/sponsors/homepage-featured`.
 * Only rows with mission_partner + featured + active appear. Seed fallback when DB empty.
 */
export default function HomeSponsorBannerPlacements() {
  const [spotlightSponsors, setSpotlightSponsors] = useState([]);
  const [carouselIntervalMs, setCarouselIntervalMs] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchDepthRef = useRef(0);
  const count = spotlightSponsors.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sponsors/homepage-featured", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(data.sponsors) && data.sponsors.length) {
          setSpotlightSponsors(data.sponsors);
          if (data.settings?.carouselIntervalMs) {
            setCarouselIntervalMs(data.settings.carouselIntervalMs);
          }
          return;
        }
        setSpotlightSponsors(getHomepageFeaturedSponsorSeed());
      } catch {
        if (!cancelled) setSpotlightSponsors(getHomepageFeaturedSponsorSeed());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

    const id = window.setInterval(tick, carouselIntervalMs);
    return () => window.clearInterval(id);
  }, [paused, count, carouselIntervalMs]);

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  if (!loading && count === 0) {
    return null;
  }

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
      {loading ? <p className="adminMuted" style={{ margin: 0 }}>Loading partners…</p> : null}
      {!loading && count > 0 ? (
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
              key={sponsor.id || sponsor.slug}
              className={`homeSponsorBannerCarouselSlide${index === activeIndex ? " isActive" : ""}`}
              aria-hidden={index !== activeIndex ? true : undefined}
            >
              <SponsorHomePlacement sponsor={sponsor} />
            </div>
          ))}
        </div>
      ) : null}
      {count > 1 ? (
        <p className="homeSponsorBannerCarouselStatus" aria-live="polite">
          Showing sponsor {activeIndex + 1} of {count}
        </p>
      ) : null}
    </section>
  );
}
