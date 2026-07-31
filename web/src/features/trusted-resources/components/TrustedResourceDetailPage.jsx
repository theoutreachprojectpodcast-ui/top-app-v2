"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";
import OrganizationLogo from "@/components/shared/OrganizationLogo";
import FavoriteStarButton from "@/components/shared/FavoriteStarButton";
import { formatEinDashed } from "@/features/nonprofits/lib/einUtils";
import TrustedResourceLinkCard from "@/features/trusted-resources/components/TrustedResourceLinkCard";
import TrustedResourceProgramCard from "@/features/trusted-resources/components/TrustedResourceProgramCard";
import { partitionForSidebar } from "@/features/trusted-resources/domain/trustedResourceConnectLinks";
import {
  isTrustedResourceFavorited,
  toggleTrustedResourceFavorite,
} from "@/features/trusted-resources/domain/trustedFavoriteKeys";
import { getTrustedResourceDetailForSlug } from "@/features/trusted-resources/api/trustedResourceCatalogApi";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { workosSignInLink, workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { getSupabaseClient } from "@/lib/supabase/client";

function formatReviewDate(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function normalizeHref(url) {
  return String(url || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/^https?:\/\//, "");
}

const PIN_PATH =
  "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z";
const SHIELD_PATH = "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z";

export default function TrustedResourceDetailPage({ slug, initialDetail = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const {
    isAuthenticated,
    favoriteEins,
    favoriteEntityKeys,
    toggleFavoriteEin,
    toggleFavoriteEntityKey,
    entitlements,
  } = useProfileData();
  const [resource, setResource] = useState(initialDetail);
  const [status, setStatus] = useState(initialDetail ? "" : "Loading trusted resource…");
  const [favBusy, setFavBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const favLock = useRef(false);

  const returnPath = `/trusted/${slug}`;
  const signInHref = workosSignInLink(pathname || returnPath, null, returnPath);
  const signUpHref = workosSignUpHref(returnPath);
  const canSave =
    !!entitlements?.saveOrganizationsAccess ||
    !!entitlements?.isPlatformAdmin ||
    !!entitlements?.isPrivilegedStaff;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initialDetail) setStatus("Loading trusted resource…");
      setLoadFailed(false);
      try {
        const { detail, canonicalSlug, redirectedFrom } = await getTrustedResourceDetailForSlug(
          supabase,
          slug,
        );
        if (cancelled) return;
        if (canonicalSlug && redirectedFrom && canonicalSlug !== String(slug || "").trim().toLowerCase()) {
          router.replace(`/trusted/${canonicalSlug}`);
          return;
        }
        if (canonicalSlug && canonicalSlug !== String(slug || "").trim().toLowerCase() && detail) {
          router.replace(`/trusted/${canonicalSlug}`);
          return;
        }
        setResource(detail);
        setStatus(detail ? "" : "");
        setLoadFailed(!detail);
      } catch (err) {
        if (cancelled) return;
        console.warn("[trusted-detail] load failed", {
          slug,
          err: String(err?.message || err),
        });
        setResource(null);
        setLoadFailed(true);
        setStatus("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, slug, router, initialDetail]);

  const isFavorited = isTrustedResourceFavorited(resource, favoriteEins, favoriteEntityKeys);

  const onFavorite = useCallback(() => {
    if (!resource || favLock.current || favBusy) return;
    favLock.current = true;
    setFavBusy(true);
    try {
      toggleTrustedResourceFavorite({
        resource,
        isAuthenticated,
        canSave,
        toggleFavoriteEin,
        toggleFavoriteEntityKey,
        onRequestSignIn: () => {
          window.location.assign(signInHref);
        },
      });
    } finally {
      window.setTimeout(() => {
        favLock.current = false;
        setFavBusy(false);
      }, 400);
    }
  }, [
    resource,
    favBusy,
    isAuthenticated,
    canSave,
    signInHref,
    toggleFavoriteEin,
    toggleFavoriteEntityKey,
  ]);

  const primaryCta = resource?.helpfulLinks?.[0] || resource?.connectLinks?.[0];
  const primaryHrefNorm = normalizeHref(primaryCta?.url || resource?.websiteUrl);
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
  const keyLinks = useMemo(() => {
    const links = resource?.helpfulLinks || [];
    return links.filter(
      (link) => link?.type !== "website" && normalizeHref(link?.url) !== primaryHrefNorm,
    );
  }, [resource?.helpfulLinks, primaryHrefNorm]);
  const programCards = useMemo(() => {
    const cards = resource?.programCards || [];
    const keyUrls = new Set(keyLinks.map((l) => normalizeHref(l.url)));
    return cards.filter((card) => {
      const href = normalizeHref(card?.url);
      if (!href || href === primaryHrefNorm) return false;
      if (keyUrls.has(href)) return false;
      return true;
    });
  }, [resource?.programCards, keyLinks, primaryHrefNorm]);
  const showWebsiteFallback =
    !hasOverview && !resource?.whoTheyServe && !programCards.length && !keyLinks.length && resource?.websiteUrl;
  const einLabel =
    resource?.einIdentityVerified && resource?.directoryNonprofitId
      ? formatEinDashed(resource.directoryNonprofitId)
      : "";
  const sidebarQuickLinks = useMemo(
    () =>
      sidebarParts.quick.filter(
        (link) => link?.type !== "website" && normalizeHref(link?.url) !== primaryHrefNorm,
      ),
    [sidebarParts.quick, primaryHrefNorm],
  );

  const favoriteControl = (
    <FavoriteStarButton
      isFavorite={!!isFavorited}
      busy={favBusy}
      favoritesEnabled={isAuthenticated && canSave}
      onToggle={onFavorite}
      onRequestSignIn={
        !isAuthenticated
          ? () => {
              window.location.assign(signInHref);
            }
          : undefined
      }
      labeled
      organizationName={resource?.name || ""}
      savedLabel="Saved"
      unsavedLabel="Save"
    />
  );

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
          {status ? <p className="trustedDetailStatus">{status}</p> : null}
          {loadFailed || !status ? (
            <>
              <h1 className="trustedDetailEmptyTitle">Trusted resource not available</h1>
              <p className="trustedDetailEmptyCopy">
                This organization is not in the published Trusted Resources directory, or the link may be
                outdated. Browse the directory to find curated partners.
              </p>
            </>
          ) : null}
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
              <div className="trustedDetailHero__logoSlot">
                <OrganizationLogo
                  src={resource.logoImage || ""}
                  alt=""
                  name={resource.name}
                  entityKey={resource.trustedResourceSlug || resource.id}
                  size="card"
                  surface="page"
                  panel="auto"
                  fallback="icon"
                  fallbackIcon={<NonprofitIcon category={cat} size={48} variant="default" />}
                />
              </div>
            </div>

            <div className="trustedDetailHero__panel card">
              <div className="trustedDetailHero__panelInner">
                <div className="trustedDetailHero__copy">
                  <p className="trustedDetailHero__eyebrow">
                    <span className="iconWrap trustedDetailHero__eyebrowIcon" aria-hidden="true">
                      <svg className="iconStroke" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path d={SHIELD_PATH} />
                      </svg>
                    </span>
                    Curated Trusted Resource
                  </p>
                  <h1 className="trustedDetailHero__title">{resource.name}</h1>
                  <div className="trustedDetailHero__chips">
                    <span
                      className="trustedDetailHero__chip"
                      style={{
                        "--tr-chip-tint":
                          cat?.tint || "color-mix(in srgb, var(--color-accent) 22%, transparent)",
                      }}
                    >
                      {cat?.label || "Trusted resource"}
                    </span>
                    {locationLabel ? (
                      <span className="trustedDetailHero__chip trustedDetailHero__chip--muted">
                        <span className="iconWrap trustedDetailHero__chipIcon" aria-hidden="true">
                          <svg className="iconStroke" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                            <path d={PIN_PATH} />
                          </svg>
                        </span>
                        {locationLabel}
                      </span>
                    ) : null}
                  </div>
                  {resource.heroMission ? (
                    <p className="trustedDetailHero__mission">{resource.heroMission}</p>
                  ) : null}
                </div>
                <div className="trustedDetailHero__actions">
                  {favoriteControl}
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
                <div className="trustedDetailAtAGlance__item">
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

              {keyLinks.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Key links</h2>
                  <p className="trustedDetailSectionLead">
                    Ways to get help, volunteer, donate, or learn more on the organization&apos;s official channels.
                  </p>
                  <div className="trustedDetailLinkGrid trustedDetailLinkGrid--key">
                    {keyLinks.map((link) => (
                      <TrustedResourceLinkCard key={`helpful-${link.type}-${link.url}`} link={link} />
                    ))}
                  </div>
                </section>
              ) : null}

              {programCards.length ? (
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Explore resources</h2>
                  <p className="trustedDetailSectionLead">
                    Key pages and programs from this organization — each opens on their official site.
                  </p>
                  <div className="trustedDetailProgramGrid">
                    {programCards.map((card) => (
                      <TrustedResourceProgramCard key={`${card.title}-${card.url || card.id}`} card={card} />
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
                <section className="card trustedDetailCard">
                  <h2 className="trustedDetailSectionTitle">Website</h2>
                  <p className="trustedDetailProse">
                    Visit the organization&apos;s official site for the latest programs and contact options.
                  </p>
                  <a className="btnSoft" href={resource.websiteUrl} target="_blank" rel="noopener noreferrer">
                    Visit website
                  </a>
                </section>
              ) : null}

              {!hasOverview &&
              !showShortLead &&
              !keyLinks.length &&
              !programCards.length &&
              !resource?.whoTheyServe &&
              !resource?.services?.length ? (
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
                    <div className="trustedDetailAsideFav">{favoriteControl}</div>
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
                    {sidebarQuickLinks.map((link) => (
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
                  </dl>
                  {resource.einIdentityVerified && resource.directoryNonprofitId ? (
                    <Link className="btnSoft" href={`/nonprofit/${resource.directoryNonprofitId}`}>
                      View directory profile
                    </Link>
                  ) : null}
                </section>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
