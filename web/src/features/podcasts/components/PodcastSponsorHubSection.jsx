"use client";

import Link from "next/link";
import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";
import FeaturedSponsorCard from "@/features/sponsors/components/FeaturedSponsorCard";
import { mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";

export default function PodcastSponsorHubSection({
  sponsors = [],
  canAccess = false,
  onApply,
  billingNote = "",
}) {
  const models = mapSponsorsToCardModels(sponsors);

  return (
    <section className="card sponsorSection podcastSection podcastSponsorHubSection">
      <PodcastSectionHeader
        eyebrow="Podcast sponsors"
        title="Sponsor the show"
        subtitle="Organizations supporting the podcast — open the application to compare tiers, review packages, and apply."
      />

      {canAccess ? (
        <>
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
