"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
} from "lucide-react";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";
import OrganizationLogo from "@/components/shared/OrganizationLogo";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSponsorBySlug } from "@/features/sponsors/api/sponsorCatalogApi";
import { sponsorBlurbsRedundant } from "@/features/sponsors/domain/sponsorViewModels";

function formatTierLabel(key) {
  const k = String(key || "").trim().toLowerCase();
  if (!k) return "";
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SocialIconLink({ item, brandName }) {
  const Icon =
    item.key === "website"
      ? Globe
      : item.key === "instagram"
        ? Instagram
        : item.key === "facebook"
          ? Facebook
          : item.key === "linkedin"
            ? Linkedin
            : item.key === "youtube"
              ? Youtube
              : item.key === "twitter"
                ? Twitter
                : Globe;
  const label = `${brandName} — ${item.label}`;
  return (
    <a
      className="sponsorProfileIconLink"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={item.label}
    >
      <Icon className="sponsorProfileIconLinkSvg" aria-hidden strokeWidth={2} />
    </a>
  );
}

export default function SponsorProfilePage({ slug }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("Loading sponsor...");
  const [logoIndex, setLogoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await getSponsorBySlug(supabase, slug);
      if (cancelled) return;
      setProfile(row);
      setStatus(row ? "" : "Sponsor profile not found.");
      setLogoIndex(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, slug]);

  const heroSrc = profile ? sanitizeDisplayableImageUrl(String(profile.background_image_url || "").trim()) : "";
  const logoCandidates = useMemo(() => {
    if (!profile) return [];
    const raw = profile.logo_candidate_urls;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((u) => sanitizeDisplayableImageUrl(String(u || "").trim())).filter(Boolean);
    }
    const one = sanitizeDisplayableImageUrl(String(profile.logo_url || "").trim());
    return one ? [one] : [];
  }, [profile]);
  const logoSrc = logoCandidates[logoIndex] || "";

  const brandName = profile ? String(profile.name || "").trim() || "Sponsor" : "Sponsor";

  return (
    <div className="sponsorProfilePageRoot">
      {!profile ? (
        <div className="card sponsorProfileCard">
          <p className="sponsorProfileStatus">{status}</p>
        </div>
      ) : (
        <>
          <div className="card sponsorProfileIntro">
            {heroSrc ? (
              <div className="sponsorProfileHeroMedia">
                <img className="sponsorProfileHeroImg" src={heroSrc} alt="" loading="lazy" decoding="async" />
                <div className="sponsorProfileHeroScrim" aria-hidden />
              </div>
            ) : null}
            <div className="sponsorProfileIntroBody">
              <div className="sponsorProfileIdentityRow">
                <OrganizationLogo
                  className="sponsorProfileLogoShell"
                  src={logoSrc}
                  alt=""
                  name={brandName}
                  size="profile"
                  surface="page"
                  panel={profile.logoPanelMode === "light" ? "light" : profile.logoPanelMode === "dark" ? "dark" : "auto"}
                  onError={() => {
                    if (logoIndex < logoCandidates.length - 1) setLogoIndex((i) => i + 1);
                  }}
                />
                <div className="sponsorProfileTitleBlock">
                  <h1 className="sponsorProfileTitle">{brandName}</h1>
                  <p className="sponsorProfileTypeLine">
                    {String(profile.sponsor_type || "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  {(() => {
                    const t = String(profile.tagline || "").trim();
                    const s = String(profile.short_description || "").trim();
                    const line = t && !sponsorBlurbsRedundant(t, s) ? t : s || t;
                    return line ? <p className="sponsorProfileLead">{line}</p> : null;
                  })()}
                  <div className="sponsorProfileMetaChips" aria-label="Organization details">
                    {profile.sponsor_display_group ? (
                      <span className="sponsorProfileMetaChip">{formatTierLabel(profile.sponsor_display_group)}</span>
                    ) : null}
                    {profile.sponsor_category ? (
                      <span className="sponsorProfileMetaChip sponsorProfileMetaChip--muted">
                        {String(profile.sponsor_category).trim()}
                      </span>
                    ) : null}
                    {profile.veteran_owned ? <span className="sponsorProfileMetaChip">Veteran-owned</span> : null}
                  </div>
                </div>
              </div>
              {profile.socialLinks?.length ? (
                <div className="sponsorProfileIconRow" aria-label="External links">
                  {profile.socialLinks.map((item) => (
                    <SocialIconLink key={item.key} item={item} brandName={brandName} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="card sponsorProfileCard sponsorProfileOverview">
            <h2 className="sponsorProfileSectionTitle">Overview</h2>
            {(() => {
              const shortD = String(profile.short_description || "").trim();
              const longD = String(profile.long_description || "").trim();
              if (!shortD && !longD) {
                return <p className="sponsorProfileProse sponsorProfileProse--muted">No description on file yet.</p>;
              }
              if (shortD && longD && sponsorBlurbsRedundant(shortD, longD)) {
                return <p className="sponsorProfileProse">{longD}</p>;
              }
              return (
                <div className="sponsorProfileProseStack">
                  {shortD && longD && !sponsorBlurbsRedundant(shortD, longD) ? (
                    <p className="sponsorProfileProse sponsorProfileProse--lead">{shortD}</p>
                  ) : null}
                  {longD && !sponsorBlurbsRedundant(longD, shortD) ? (
                    <p className="sponsorProfileProse">{longD}</p>
                  ) : null}
                  {!longD && shortD ? <p className="sponsorProfileProse">{shortD}</p> : null}
                </div>
              );
            })()}
          </div>

          {(profile.additional_links || []).length ? (
            <div className="card sponsorProfileCard sponsorProfileMore">
              <h2 className="sponsorProfileSectionTitle">More links</h2>
              <ul className="sponsorProfileMoreList">
                {profile.additional_links.map((item) => {
                  const href = String(item.url || "").trim();
                  const isMail = href.toLowerCase().startsWith("mailto:");
                  return (
                    <li key={href}>
                      <a
                        className="sponsorProfileMoreLink"
                        href={href}
                        {...(isMail
                          ? { rel: "noopener noreferrer" }
                          : { target: "_blank", rel: "noopener noreferrer" })}
                        aria-label={`${brandName} — ${item.label || href}`}
                        title={item.label || href}
                      >
                        {isMail ? <Mail className="sponsorProfileMoreLinkIcon" aria-hidden strokeWidth={2} /> : null}
                        {!isMail ? <ExternalLink className="sponsorProfileMoreLinkIcon" aria-hidden strokeWidth={2} /> : null}
                        <span className="sponsorProfileMoreLinkText">{item.label || href}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="sponsorProfileBackRow">
            <Link className="sponsorProfileBackLink" href="/sponsors">
              ← All sponsors
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
