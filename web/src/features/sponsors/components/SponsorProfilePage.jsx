"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import HeaderInner from "@/components/layout/HeaderInner";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
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

  return (
    <main className="topApp sponsorProfileShell">
      <div className="headerBrandStack">
        <BrandMark size="header" />
      </div>
      <header className="topbar">
        <HeaderInner className="topbarInner nonprofitProfileTopbarInner">
          <div className="topbarZone topbarLeft">
            <Link className="btnSoft nonprofitProfileBack" href="/">← Back</Link>
          </div>
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <ColorSchemeToggle />
              {!session.loading && session.authenticated ? (
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
              style={profile.background_image_url ? { backgroundImage: `linear-gradient(130deg, rgba(6,10,14,0.84), rgba(6,10,14,0.68)), url(${JSON.stringify(profile.background_image_url)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            >
              <div className="sponsorProfileIdentity">
                <div className="sponsorPremiumLogoShell">
                  {profile.logo_url ? <img className="sponsorPremiumLogoImg" src={profile.logo_url} alt="" loading="lazy" /> : <span className="sponsorPremiumWordmark">{profile.name}</span>}
                </div>
                <div>
                  <h1 className="sponsorProfileTitle">{profile.name}</h1>
                  <p className="sponsorPremiumIndustry">{profile.sponsor_type}</p>
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
                <div className="sponsorPremiumSocial">
                  {profile.socialLinks?.map((item) => (
                    <a key={item.key} className="sponsorPremiumSocialLink" href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>
                  ))}
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
