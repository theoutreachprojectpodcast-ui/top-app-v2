"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";
import { formatEinDashed } from "@/features/nonprofits/lib/einUtils";
import TrustedResourceLinkCard from "@/features/trusted-resources/components/TrustedResourceLinkCard";
import TrustedResourceProgramCard from "@/features/trusted-resources/components/TrustedResourceProgramCard";
import { partitionForSidebar } from "@/features/trusted-resources/domain/trustedResourceConnectLinks";
import { getTrustedResourceDetailForSlug } from "@/features/trusted-resources/api/trustedResourceCatalogApi";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { workosSignInLink, workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { getSupabaseClient } from "@/lib/supabase/client";

function formatReviewDate(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function FavoriteButton({ active, busy, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`btnSoft trustedDetailFavBtn${active ? " isActive" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
    >
      <Heart className="trustedDetailFavBtn__icon" strokeWidth={2} fill={active ? "currentColor" : "none"} />
      {active ? "Saved" : "Add to favorites"}
    </button>
  );
}

/**
 * @param {{ slug: string, initialResource?: object | null }} props
 */
export default function TrustedResourceDetailPage({ slug, initialResource = null }) {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { isAuthenticated, favoriteEntityKeys, toggleFavoriteEntityKey } = useProfileData();
  const [resource, setResource] = useState(initialResource);
  const [status, setStatus] = useState(initialResource ? "" : "Loading trusted resource…");
  const [favBusy, setFavBusy] = useState(false);

  const returnPath = `/trusted/${slug}`;
  const signInHref = workosSignInLink(pathname || returnPath, null, returnPath);
  const signUpHref = workosSignUpHref(returnPath);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initialResource) setStatus("Loading trusted resource…");
      const row = await getTrustedResourceDetailForSlug(supabase, slug);
      if (cancelled) return;
      setResource(row);
      setStatus(row ? "" : "Trusted resource not found.");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, slug, initialResource]);

  const favoriteKey = resource?.trustedResourceSlug ? `trusted:${resource.trustedResourceSlug}` : "";
  const isFavorited = favoriteKey && favoriteEntityKeys.includes(favoriteKey);

  const onFavorite = useCallback(() => {
    if (!favoriteKey) return;
    if (!isAuthenticated) {
      window.location.assign(signInHref);
      return;
    }
    setFavBusy(true);
    try {
      toggleFavoriteEntityKey(favoriteKey);
    } finally {
      setFavBusy(false);
    }
  }, [favoriteKey, isAuthenticated, signInHref, toggleFavoriteEntityKey]);

  const primaryCta = resource?.helpfulLinks?.[0] || resource?.connectLinks?.[0];
  const cat = resource?.trustedResourceCategory || resource?.category;
  const heroSrc = resource?.headerImage?.replace(/'/g, "%27") || "";
  const locationLabel =
    resource?.serviceArea ||
    resource?.locationLabel ||
    resource?.trustedResourceDisplayLocation ||
    "";
  const sidebarParts = useMemo(
    () => partitionForSidebar(resource?.connectLinks || []),
    [resource?.connectLinks],
  );
  const overviewText = resource?.overview || resource?.mission || "";
  const hasOverview = Boolean(String(overviewText).trim());
  const shortLead = String(resource?.shortDescription || "").trim();
  const showShortLead =
    shortLead &&
    shortLead !== String(overviewText).trim() &&
    shortLead.length < String(overviewText).length - 24;
  const helpfulLinks = resource?.helpfulLinks || [];
  const showWebsiteFallback =
    !hasOverview && !resource?.whoTheyServe && !resource?.programCards?.length && resource?.websiteUrl;
  const einLabel =
    resource?.einIdentityVerified && resource?.directoryNonprofitId
      ? formatEinDashed(resource.directoryNonprofitId)
      : "";

  return (
    <section className="card trustedDetailRoute" aria-label="Trusted resource profile">
      <nav className="trustedDetailBreadcrumb" aria-label="Breadcrumb">
        <Link href="/trusted">Trusted Resources</Link>
        {resource ? (
          <>
            <span className="trustedDetailBreadcrumb__sep" aria-hidden="true">
              /
            </span>
            <span className="trustedDetailBreadcrumb__current">{resource.name}</span>
          </>
        ) : null}
      </nav>

      {!resource ? (
        <div className="trustedDetailPage trustedDetailPage--empty">
          <p className="trustedDetailStatus">{status}</p>
          <Link className="btnSoft" href="/trusted">
            ← Back to Trusted Resources
          </Link>
        </div>
      ) : (
        <div className="trustedDetailPage">
          <section className="trustedDetailHero" aria-label={`${resource.name} profile`}>
            <div className="trustedDetailHero__bannerWrap">
              {heroSrc ? (
                <div
                  className={`trustedDetailHero__banner${resource.headerIsFallback ? " trustedDetailHero__banner--fallback" : ""}`}
                  style={{ backgroundImage: `url('${heroSrc}')` }}
                  role="img"
                  aria-label=""
                />
              ) : (
                <div className="trustedDetailHero__banner trustedDetailHero__banner--empty" aria-hidden="true" />
              )}
              <div className="trustedDetailHero__bannerScrim" aria-hidden="true" />
              <div className="trustedDetailHero__logoBadge card">
                {resource.logoImage ? (
                  <img
                    className="trustedDetailHero__logo"
                    src={resource.logoImage}
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <NonprofitIcon category={cat} size={48} variant="default" />
                )}
              </div>
            </div>

            <div className="trustedDetailHero__panel card">
              <div className="trustedDetailHero__panelInner">
                <div className="trustedDetailHero__copy">
                  <p className="trustedDetailHero__eyebrow">
                    <ShieldCheck className="trustedDetailHero__eyebrowIcon" aria-hidden strokeWidth={2} />
                    Curated Trusted Resource
                  </p>
                  <h1 className="trustedDetailHero__title">{resource.name}</h1>
                  <div className="trustedDetailHero__chips">
                    <span
                      className="trustedDetailHero__chip"
                      style={{ "--tr-chip-tint": cat?.tint || "rgba(110, 168, 207, 0.22)" }}
                    >
                      {cat?.label || "Trusted resource"}
                    </span>
                    {locationLabel ? (
                      <span className="trustedDetailHero__chip trustedDetailHero__chip--muted">
                        <MapPin className="trustedDetailHero__chipIcon" aria-hidden strokeWidth={2} />
                        {locationLabel}
                      </span>
                    ) : null}
                  </div>
                  {resource.heroMission ? (
                    <p className="trustedDetailHero__mission">{resource.heroMission}</p>
                  ) : null}
                </div>
                <div className="trustedDetailHero__actions">
                  <FavoriteButton active={!!isFavorited} busy={favBusy} onClick={onFavorite} />
                  {primaryCta ? (
                    <a
                      className="btnPrimary trustedDetailHero__cta"
                      href={primaryCta.url}
                      target={primaryCta.external !== false ? "_blank" : undefined}
                      rel={primaryCta.external !== false ? "noopener noreferrer" : undefined}
                    >
                      {primaryCta.label}
                    </a>
                  ) : resource.websiteUrl ? (
                    <a
                      className="btnPrimary trustedDetailHero__cta"
                      href={resource.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="trustedDetailAtAGlance card" aria-label="At a glance">
            <dl className="trustedDetailAtAGlance__grid">
              <div className="trustedDetailAtAGlance__item">
                <dt>Category</dt>
                <dd>{cat?.label || "Trusted resource"}</dd>
              </div>
              {locationLabel ? (
                <div className="trustedDetailAtAGlance__item">
                  <dt>Service area</dt>
                  <dd>{locationLabel}</dd>
                </div>
              ) : null}
              {resource.websiteUrl ? (
                <div className="trustedDetailAtAGlance__item trustedDetailAtAGlance__item--wide">
                  <dt>Website</dt>
                  <dd>
                    <a href={resource.websiteUrl} target="_blank" rel="noopener noreferrer">
                      {resource.websiteUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                    </a>
                  </dd>
                </div>
              ) : null}
              {einLabel ? (
                <div className="trustedDetailAtAGlance__item">
                  <dt>EIN</dt>
                  <dd>{einLabel}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="trustedDetailGrid">
            <div className="trustedDetailMain">
              {showShortLead ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Summary</h2>
                  <p className="trustedDetailProse trustedDetailProse--lead">{shortLead}</p>
                </section>
              ) : null}

              {hasOverview ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Organization overview</h2>
                  <p className="trustedDetailProse trustedDetailProse--lead">{overviewText}</p>
                  {resource.websiteUrl ? (
                    <p className="trustedDetailInlineCta">
                      <a
                        className="btnSoft"
                        href={resource.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Official website
                      </a>
                    </p>
                  ) : null}
                </section>
              ) : null}

              {resource.whoTheyServe ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Who they serve</h2>
                  <p className="trustedDetailProse">{resource.whoTheyServe}</p>
                </section>
              ) : null}

              {resource.services?.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Programs &amp; services</h2>
                  <ul className="trustedDetailList">
                    {resource.services.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {helpfulLinks.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Key links</h2>
                  <p className="trustedDetailSectionLead">
                    Primary ways to get help, volunteer, donate, or learn more on the organization&apos;s official
                    channels.
                  </p>
                  <div className="trustedDetailLinkGrid trustedDetailLinkGrid--key">
                    {helpfulLinks.map((link) => (
                      <TrustedResourceLinkCard key={`helpful-${link.type}-${link.url}`} link={link} />
                    ))}
                  </div>
                </section>
              ) : null}

              {resource.programCards?.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Explore resources</h2>
                  <p className="trustedDetailSectionLead">
                    Key pages and programs from this organization — each opens on their official site.
                  </p>
                  <div className="trustedDetailProgramGrid">
                    {resource.programCards.map((card) => (
                      <TrustedResourceProgramCard key={card.id} card={card} />
                    ))}
                  </div>
                </section>
              ) : null}

              {resource.connectLinks?.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Connect with this organization</h2>
                  <p className="trustedDetailSectionLead">
                    Official ways to learn more, get support, volunteer, or follow their work.
                  </p>
                  <div className="trustedDetailLinkGrid">
                    {resource.connectLinks.map((link) => (
                      <TrustedResourceLinkCard key={`${link.type}-${link.url}`} link={link} />
                    ))}
                  </div>
                </section>
              ) : null}

              {resource.whyItMatters ? (
                <section className="card trustedDetailCard trustedDetailCard--accent">
                  <h2 className="trustedDetailSectionTitle">Why this matters</h2>
                  <p className="trustedDetailProse">{resource.whyItMatters}</p>
                </section>
              ) : null}

              {showWebsiteFallback ? (
                <section className="card trustedDetailCard trustedDetailCard--muted">
                  <p className="trustedDetailProse">
                    More information is available on the organization&apos;s official website.
                  </p>
                  <a
                    className="btnSoft"
                    href={resource.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit website
                  </a>
                </section>
              ) : null}

              {!hasOverview && !showWebsiteFallback && !resource.connectLinks?.length ? (
                <section className="card trustedDetailCard trustedDetailCard--muted">
                  <p className="trustedDetailProse">More information coming soon for this trusted resource.</p>
                </section>
              ) : null}
            </div>

            <aside className="trustedDetailAside" aria-label="Quick actions and facts">
              <div className="trustedDetailAsideSticky">
                <section className="card trustedDetailCard trustedDetailAsideActions">
                  <h2 className="trustedDetailSectionTitle">Quick actions</h2>
                  <div className="trustedDetailAsideActionStack">
                    <FavoriteButton
                      active={!!isFavorited}
                      busy={favBusy}
                      onClick={onFavorite}
                      className="trustedDetailFavBtn--block"
                    />
                    {!isAuthenticated ? (
                      <p className="trustedDetailSignInHint">
                        <a href={signInHref}>Sign in</a> or{" "}
                        <a href={signUpHref}>create an account</a> to save favorites across devices.
                      </p>
                    ) : null}
                    {primaryCta ? (
                      <a
                        className="btnPrimary trustedDetailAsideCta"
                        href={primaryCta.url}
                        target={primaryCta.external !== false ? "_blank" : undefined}
                        rel={primaryCta.external !== false ? "noopener noreferrer" : undefined}
                      >
                        {primaryCta.label}
                      </a>
                    ) : resource.websiteUrl ? (
                      <a
                        className="btnPrimary trustedDetailAsideCta"
                        href={resource.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit website
                      </a>
                    ) : null}
                    {sidebarParts.quick.map((link) => (
                      <TrustedResourceLinkCard key={`quick-${link.type}-${link.url}`} link={link} />
                    ))}
                  </div>
                </section>

                {sidebarParts.social.length ? (
                  <section className="card trustedDetailCard">
                    <h2 className="trustedDetailSectionTitle">Social</h2>
                    <div className="trustedDetailLinkStack">
                      {sidebarParts.social.map((link) => (
                        <TrustedResourceLinkCard key={`${link.type}-${link.url}`} link={link} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {sidebarParts.contact.length ? (
                  <section className="card trustedDetailCard">
                    <h2 className="trustedDetailSectionTitle">Contact</h2>
                    <div className="trustedDetailLinkStack">
                      {sidebarParts.contact.map((link) => (
                        <TrustedResourceLinkCard key={`${link.type}-${link.url}`} link={link} />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="card trustedDetailCard trustedDetailQuickFacts">
                  <h2 className="trustedDetailSectionTitle">Quick facts</h2>
                  <dl className="trustedDetailFacts">
                    {locationLabel ? (
                      <>
                        <dt>Service area</dt>
                        <dd>{locationLabel}</dd>
                      </>
                    ) : null}
                    {cat?.label ? (
                      <>
                        <dt>Focus area</dt>
                        <dd>{cat.label}</dd>
                      </>
                    ) : null}
                    {resource.isVerified ? (
                      <>
                        <dt>Listing</dt>
                        <dd>Curated Trusted Resource</dd>
                      </>
                    ) : null}
                    {einLabel ? (
                      <>
                        <dt>EIN</dt>
                        <dd>{einLabel}</dd>
                      </>
                    ) : null}
                    {resource.lastReviewedAt ? (
                      <>
                        <dt>Last reviewed</dt>
                        <dd>{formatReviewDate(resource.lastReviewedAt)}</dd>
                      </>
                    ) : null}
                    {resource.detailReviewStatus ? (
                      <>
                        <dt>Review status</dt>
                        <dd>{resource.detailReviewStatus}</dd>
                      </>
                    ) : null}
                  </dl>
                  {resource.einIdentityVerified && resource.directoryNonprofitId ? (
                    <Link
                      className="trustedDetailDirectoryLink"
                      href={`/nonprofit/${resource.directoryNonprofitId}`}
                    >
                      View nonprofit directory profile →
                    </Link>
                  ) : null}
                </section>
              </div>
            </aside>
          </div>

          <p className="trustedDetailBackRow">
            <Link className="trustedDetailBackLink" href="/trusted">
              ← All Trusted Resources
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
