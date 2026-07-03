"use client";

import Link from "next/link";
import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";
import SponsorOpportunitiesPanel from "@/features/sponsors/components/SponsorOpportunitiesPanel";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";
import { mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";
import { PODCAST_SPONSOR_TIERS } from "@/features/sponsors/data/podcastSponsorTiers";

export default function PodcastSponsorHubSection({
  sponsors = [],
  canAccess = false,
  onApply,
  onSelectTier,
  selectedTierId = "",
  billingNote = "",
}) {
  const models = mapSponsorsToCardModels(sponsors);

  return (
    <section className="card sponsorSection podcastSection podcastSponsorHubSection">
      <PodcastSectionHeader
        eyebrow="Podcast sponsors"
        title="Sponsor the show"
        subtitle="Community, Impact, and Foundational packages for episode-first placements — compare tiers, review benefits, and apply without leaving the podcast experience."
      />

      {canAccess ? (
        <>
          <SponsorTierComparison
            tiers={PODCAST_SPONSOR_TIERS}
            variant="podcast"
            selectedTierId={selectedTierId}
            onSelectTier={onSelectTier}
            title="Podcast sponsor packages"
            lead="Episode acknowledgements, show notes, and on-page podcast presence — podcast channels only."
            familyTitle="Select your package"
            familyDescription="Tap a tier to select it, then apply with that package."
            compareHref="/podcasts"
          />

          <SponsorOpportunitiesPanel
            checkoutReturnPath="/podcasts"
            onSelectTier={onSelectTier}
            programScope="podcast"
          />

          {models.length ? (
            <div className="podcastSponsorHubSection__roster">
              <h4 className="podcastSponsorHubSection__rosterTitle">Current podcast sponsors</h4>
              <p className="podcastMuted podcastSponsorHubSection__rosterLead">
                Organizations currently highlighted across podcast surfaces.
              </p>
              <div className="sponsorFeaturedShowcase podcastSponsorsCardGrid">
                {models.map((s) => (
                  <FeaturedSponsorCard key={s.id} sponsor={s} hidePrimaryBadge />
                ))}
              </div>
            </div>
          ) : null}

          <div className="row wrap">
            <button className="btnPrimary" type="button" onClick={onApply}>
              Apply to be a podcast sponsor
            </button>
          </div>

          {billingNote ? (
            <p className="podcastMuted" role="status">
              {billingNote}
            </p>
          ) : null}

          <p className="podcastMuted podcastSponsorHubSection__foot">
            Mission partner, foundational, and impact packages for the main platform live on the{" "}
            <Link href="/sponsors">Sponsors hub</Link>.
          </p>
        </>
      ) : (
        <div className="podcastLockCard">
          <strong>Upgrade to Pro for podcast sponsor opportunities</strong>
          <p>
            Support members can watch episodes, explore guests, and apply to be on the show. Pro membership unlocks
            podcast sponsor packages and the full partnership flow.
          </p>
          <div className="row wrap">
            <Link className="btnSoft" href="/profile">
              Profile &amp; membership
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
