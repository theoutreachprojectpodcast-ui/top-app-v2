"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import HeaderInner from "@/components/layout/HeaderInner";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSponsorBySlug } from "@/features/sponsors/api/sponsorCatalogApi";

export default function SponsorProfilePage({ slug }) {
  const session = useAuthSession();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("Loading sponsor...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await getSponsorBySlug(supabase, slug);
      if (cancelled) return;
      setProfile(row);
      setStatus(row ? "" : "Sponsor profile not found.");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, slug]);

  const sponsorHeroBg = profile
    ? sanitizeDisplayableImageUrl(String(profile.background_image_url || "").trim())
    : "";
  const sponsorLogoSrc = profile ? sanitizeDisplayableImageUrl(String(profile.logo_url || "").trim()) : "";

  const navCache = typeof window !== "undefined" ? readNavAuthCache() : null;
  const sponsorHeaderAuthed =
    session.authenticated || (session.loading && !!navCache?.authenticated);

  return (
    <main className="topApp sponsorProfileShell" data-page-atmosphere="sponsors">
      <div className="headerBrandStack">
        <Link href="/" aria-label="Go to home">
          <BrandMark size="header" />
        </Link>
      </div>
      <header className="topbar">
        <HeaderInner className="topbarInner nonprofitProfileTopbarInner">
          <div className="topbarZone topbarLeft">
            <Link className="btnSoft nonprofitProfileBack" href="/">← Back</Link>
          </div>
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <ColorSchemeToggle />
              {sponsorHeaderAuthed ? (
                <>
                  <HeaderNotificationBell variant="subpage" />
                  <Link className="btnSoft sponsorBtn" href="/profile">
                    Profile
                  </Link>
                </>
              ) : null}
              <Link className="btnSoft" href="/sponsors">Sponsors</Link>
            </div>
          </div>
        </HeaderInner>
      </header>
      <div className="topbarOcclusion" aria-hidden="true" />
      <section className="shell nonprofitProfileOuter">
        {!profile ? (
          <div className="card"><p>{status}</p></div>
        ) : (
          <>
            <section
              className="card sponsorProfileHero"
              style={
                sponsorHeroBg
                  ? {
                      backgroundImage: `linear-gradient(130deg, rgba(6,10,14,0.67), rgba(6,10,14,0.54)), url('${sponsorHeroBg.replace(/'/g, "%27")}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <div className="sponsorProfileIdentity">
                <div
                  className={`sponsorPremiumLogoShell${profile.logoPanelMode === "light" ? " sponsorPremiumLogoShell--panel-light" : ""}`}
                >
                  {sponsorLogoSrc ? (
                    <img className="sponsorPremiumLogoImg" src={sponsorLogoSrc} alt="" loading="lazy" />
                  ) : (
                    <span className="sponsorPremiumWordmark">{profile.name}</span>
                  )}
                </div>
                <div>
                  <h1 className="sponsorProfileTitle">{profile.name}</h1>
                  <p className="sponsorPremiumIndustry">
                    {String(profile.sponsor_type || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <p className="sponsorPremiumTagline">{profile.tagline || profile.short_description}</p>
                </div>
              </div>
            </section>
            <section className="card sponsorProfileGrid">
              <article>
                <h3>Overview</h3>
                <p>{profile.short_description || "No short description yet."}</p>
                <p>{profile.long_description || "No long description yet."}</p>
              </article>
              <article>
                <h3>Links</h3>
                <div className="sponsorProfileLinks">
                  {profile.socialLinks?.length ? (
                    profile.socialLinks.map((item) => (
                      <a
                        key={item.key}
                        className="sponsorProfileOutboundLink"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.label}
                      </a>
                    ))
                  ) : (
                    <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--text-body-sm)" }}>
                      No external links on file yet.
                    </p>
                  )}
                </div>
                {(profile.additional_links || []).length ? (
                  <>
                    <h4>Additional resources</h4>
                    <ul className="sponsorBulletList">
                      {profile.additional_links.map((item) => (
                        <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.label || item.url}</a></li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
