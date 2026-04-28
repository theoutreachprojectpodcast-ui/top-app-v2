"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";
import NonprofitSocialLinks from "@/features/nonprofits/components/NonprofitSocialLinks";
import { fetchNonprofitProfileDetail } from "@/features/directory/api";
import { resolveFindInfoHref } from "@/features/nonprofits/domain/nonprofitCardActions";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mergeDirectoryRowWithEnrichment } from "@/lib/supabase/enrichmentMerge";
import { mapDirectoryRow } from "@/lib/supabase/mappers";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import { PROFILE_KEY } from "@/lib/constants";
import { loadJson } from "@/lib/storage";

function sanitizePlainText(text) {
  if (!text) return "";
  return String(text)
    .replace(/<[^>]*>/g, "")
    .trim();
}

function readProfileTheme() {
  if (typeof window === "undefined") return "clean";
  try {
    const p = loadJson(PROFILE_KEY, {});
    const t = String(p?.theme || "").trim();
    return t || "clean";
  } catch {
    return "clean";
  }
}

export default function NonprofitProfilePage({ ein: einParam }) {
  const router = useRouter();
  const sb = useMemo(() => getSupabaseClient(), []);
  const { isAuthenticated, favoriteEins, toggleFavoriteEin } = useProfileData();

  const [theme, setTheme] = useState("clean");
  const [card, setCard] = useState(null);
  const [mergeBase, setMergeBase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrichStatus, setEnrichStatus] = useState("");
  const [enrichBusy, setEnrichBusy] = useState(false);

  useEffect(() => {
    setTheme(readProfileTheme());
  }, []);

  const reloadDetail = useCallback(
    async (digits) => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Directory is unavailable (missing Supabase configuration).");
        setCard(null);
        setMergeBase(null);
        return;
      }
      const { card: next, error: fetchError, mergeBase: base, identityRejected } = await fetchNonprofitProfileDetail(
        supabase,
        digits
      );
      if (fetchError) {
        setError("Could not load this organization.");
        setCard(null);
        setMergeBase(null);
        return;
      }
      if (identityRejected) {
        setError("This organization is not available as a verified directory profile.");
        setCard(null);
        setMergeBase(null);
        return;
      }
      if (!next) {
        setError("Organization not found in the directory.");
        setCard(null);
        setMergeBase(null);
        return;
      }
      setError("");
      setCard(next);
      setMergeBase(base || null);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const digits = normalizeEinDigits(einParam);
      if (digits.length !== 9) {
        setError("Invalid organization identifier.");
        setCard(null);
        setMergeBase(null);
        setLoading(false);
        return;
      }
      try {
        await reloadDetail(digits);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [einParam, reloadDetail]);

  const einDigits = normalizeEinDigits(einParam);
  const isFavorite = einDigits.length === 9 && favoriteEins.includes(einDigits);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  async function runEnrichment() {
    if (einDigits.length !== 9 || !mergeBase) return;
    setEnrichBusy(true);
    setEnrichStatus("");
    try {
      const res = await fetch("/api/nonprofit/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ein: einDigits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEnrichStatus(data?.error || "Could not refresh from the organization website.");
        return;
      }
      if (data.persisted) {
        await reloadDetail(einDigits);
      } else if (data.enrichmentRow) {
        setMergeBase((prev) => {
          if (!prev || !data.enrichmentRow) return prev;
          const next = mergeDirectoryRowWithEnrichment(prev, data.enrichmentRow);
          setCard(mapNonprofitCardRow(mapDirectoryRow(next), "directory"));
          return next;
        });
      }
      if (data.verified) {
        setEnrichStatus(data.persisted ? "Profile updated from the official website." : "Verified details loaded (save requires server configuration).");
      } else {
        setEnrichStatus(
          data.reason === "no_website"
            ? "No website is listed for this organization."
            : "Website content did not meet verification checks, so nothing new was shown."
        );
      }
    } catch {
      setEnrichStatus("Network error while refreshing.");
    } finally {
      setEnrichBusy(false);
    }
  }

  const socialLinks = card?.links?.filter((l) => l.type !== "website") || [];
  const websiteLinks = card?.links?.filter((l) => l.type === "website") || [];
  const heroUrl =
    card?.heroImageUrl && /^https?:\/\//i.test(String(card.heroImageUrl))
      ? String(card.heroImageUrl)
      : "";

  return (
    <div className={`theme-${theme} nonprofitProfileShell nonprofitProfileShell--inSiteChrome`}>
      <div className="nonprofitProfileToolbar">
        <button className="btnSoft nonprofitProfileBack" type="button" onClick={goBack}>
          ← Back
        </button>
      </div>

      <section className="shell nonprofitProfileOuter">
        <div className="nonprofitProfileBody">
          {loading ? <p className="nonprofitProfileStatus">Loading organization…</p> : null}
          {!loading && error ? <p className="applyError">{error}</p> : null}
          {!loading && card ? (
            <div className="nonprofitProfileLayout">
              <div
                className="nonprofitProfileHero card"
                style={
                  heroUrl
                    ? {
                        backgroundImage: `linear-gradient(145deg, color-mix(in srgb, var(--color-bg-app) 82%, transparent), color-mix(in srgb, var(--color-bg-card) 55%, transparent)), url(${JSON.stringify(heroUrl)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="nonprofitProfileHeroInner">
                  <div className="nonprofitProfileIdentity">
                    {card.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="nonprofitProfileLogo" src={card.logoUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="nonprofitProfileIconWrap">
                        <NonprofitIcon category={card.category} size={40} variant="default" />
                      </div>
                    )}
                    <div className="nonprofitProfileTitleBlock">
                      <h1 className="nonprofitProfileTitle">{card.name}</h1>
                      {card.displayNameOnSite &&
                      sanitizePlainText(card.displayNameOnSite) !== sanitizePlainText(card.name) ? (
                        <p className="nonprofitProfileNameOnSite" title="As shown on the official website">
                          On site:{" "}
                          <span className="torpEntityNameInline">{sanitizePlainText(card.displayNameOnSite)}</span>
                        </p>
                      ) : null}
                      {card.tagline ? <p className="nonprofitProfileTagline">{sanitizePlainText(card.tagline)}</p> : null}
                    </div>
                    {einDigits.length === 9 ? (
                      <div className="nonprofitProfileFavSlot">
                        {isAuthenticated ? (
                          <button
                            className={`favBtn${isFavorite ? " favBtn--on" : ""}`}
                            type="button"
                            onClick={() => toggleFavoriteEin(einDigits)}
                            aria-pressed={isFavorite}
                            aria-label={isFavorite ? "Remove from saved" : "Save organization"}
                          >
                            {isFavorite ? "★" : "☆"}
                          </button>
                        ) : (
                          <Link className="btnSoft nonprofitProfileSignInHint" href="/">
                            Sign in to save
                          </Link>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="nonprofitProfileMetaChips">
                    <span className="nonprofitProfileChip">
                      <NonprofitIcon category={card.category} size={16} variant="default" />
                      {card.category.label}
                    </span>
                    {card.nonprofitType && card.nonprofitType !== card.category.label ? (
                      <span className="nonprofitProfileChip">{card.nonprofitType}</span>
                    ) : null}
                    <span className="nonprofitProfileChip">{card.location}</span>
                    {card.foundedYear ? <span className="nonprofitProfileChip">Founded {card.foundedYear}</span> : null}
                    {card.ein ? <span className="nonprofitProfileChip">EIN {card.ein}</span> : null}
                  </div>
                </div>
              </div>

              <div className="nonprofitProfileActions card">
                <h2 className="nonprofitProfileSectionTitle">Connect</h2>
                <div className="nonprofitProfileActionRow">
                  <a className="btnBlack btnBlack--findInfo" href={resolveFindInfoHref(card)} target="_blank" rel="noopener noreferrer">
                    Find Info
                  </a>
                  {websiteLinks.map((l) => (
                    <a key={l.url} className="btnPrimary" href={l.url} target="_blank" rel="noopener noreferrer">
                      Website
                    </a>
                  ))}
                  <NonprofitSocialLinks links={socialLinks} />
                </div>
                <div className="nonprofitProfileEnrichRow">
                  <button className="btnSoft" type="button" disabled={enrichBusy || !mergeBase} onClick={runEnrichment}>
                    {enrichBusy ? "Refreshing…" : "Refresh from official website"}
                  </button>
                  {enrichStatus ? <p className="nonprofitProfileEnrichNote">{enrichStatus}</p> : null}
                </div>
              </div>

              {card.headline ? (
                <div className="card nonprofitProfilePanel">
                  <h2 className="nonprofitProfileSectionTitle">Overview</h2>
                  <p className="nonprofitProfileHeadline">{sanitizePlainText(card.headline)}</p>
                </div>
              ) : null}

              {card.missionStatement ? (
                <div className="card nonprofitProfilePanel">
                  <h2 className="nonprofitProfileSectionTitle">Mission</h2>
                  <p className="nonprofitProfileProse">{sanitizePlainText(card.missionStatement)}</p>
                </div>
              ) : null}

              {card.shortDescription || card.description ? (
                <div className="card nonprofitProfilePanel">
                  <h2 className="nonprofitProfileSectionTitle">Summary</h2>
                  <p className="nonprofitProfileProse">
                    {sanitizePlainText(card.shortDescription || card.description)}
                  </p>
                </div>
              ) : null}

              {card.longDescription ? (
                <div className="card nonprofitProfilePanel">
                  <h2 className="nonprofitProfileSectionTitle">About</h2>
                  <p className="nonprofitProfileProse nonprofitProfileProse--long">
                    {sanitizePlainText(card.longDescription)}
                  </p>
                </div>
              ) : null}

              {card.serviceArea ? (
                <div className="card nonprofitProfilePanel">
                  <h2 className="nonprofitProfileSectionTitle">Service area</h2>
                  <p className="nonprofitProfileProse">{sanitizePlainText(card.serviceArea)}</p>
                </div>
              ) : null}

              {(card.metadataSource ||
                card.profileEnrichedAt ||
                card.lastVerifiedAt ||
                card.sourceSummary ||
                card.researchStatus) && (
                <p className="nonprofitProfileProvenance">
                  {card.researchStatus ? <>Research: {sanitizePlainText(card.researchStatus)}. </> : null}
                  {card.sourceSummary ? <>{sanitizePlainText(card.sourceSummary)} </> : null}
                  {card.metadataSource ? <>Source: {sanitizePlainText(card.metadataSource)}. </> : null}
                  {card.lastVerifiedAt
                    ? <>Last verified {new Date(card.lastVerifiedAt).toLocaleDateString()}. </>
                    : null}
                  {card.profileEnrichedAt
                    ? <>Profile updated {new Date(card.profileEnrichedAt).toLocaleDateString()}.</>
                    : null}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
