"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import {
  PODCAST_PLACEMENT_OPTIONS,
  PODCAST_SPONSOR_TIERS,
  SPONSOR_PROGRAM_TYPE_PODCAST,
} from "@/features/sponsors/data/podcastSponsorTiers";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function PodcastSponsorFlowModal({ open, onClose, supabase: supabaseProp, initialTierId, stripeReturn }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const [tierId, setTierId] = useState(initialTierId || PODCAST_SPONSOR_TIERS[0]?.id);

  useEffect(() => {
    if (!open) return;
    if (initialTierId && PODCAST_SPONSOR_TIERS.some((t) => t.id === initialTierId)) {
      setTierId(initialTierId);
    }
  }, [open, initialTierId]);

  if (!open) return null;

  return (
    <div
      className="modalOverlay podcastModalOverlay podcastSponsorFlowOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="podcast-sponsor-flow-title"
      onClick={onClose}
    >
      <div className="modalCard podcastModalCard podcastSponsorFlowModal" onClick={(e) => e.stopPropagation()}>
        <div className="podcastSponsorFlowModal__chrome">
          <div className="podcastSponsorFlowModal__topBar">
            <PodcastSectionHeader
              titleId="podcast-sponsor-flow-title"
              eyebrow="Podcast sponsors"
              title="Sponsor the show"
              subtitle="Compare Community, Impact, and Foundational tiers, expand placements and benefits, then complete the application — all in the podcast experience."
            />
            <button type="button" className="podcastSponsorFlowModal__close" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="podcastScope podcastSponsorFlowModal__scroll">
            <SponsorTierComparison
              tiers={PODCAST_SPONSOR_TIERS}
              variant="podcast"
              selectedTierId={tierId}
              onSelectTier={setTierId}
              title="Podcast sponsor tiers"
              lead="Episode-first packages for the show — podcast channels only."
              familyTitle="Select your package"
              familyDescription="Tap a tier to select it, then scroll to apply with that package."
              compareHref="/podcasts"
            />

            <SponsorApplicationForm
              supabase={supabase}
              selectedTierId={tierId}
              onSelectTier={setTierId}
              variant="modal"
              designContext="podcast"
              programType={SPONSOR_PROGRAM_TYPE_PODCAST}
              tiers={PODCAST_SPONSOR_TIERS}
              placementOptions={PODCAST_PLACEMENT_OPTIONS}
              onSuccessfulSubmit={onClose}
              stripeReturn={stripeReturn}
            />

            <div className="podcastSponsorFlowModal__foot">
              <p className="podcastSponsorFlowModal__footNote">
                Mission partner packages (website &amp; ecosystem) live on the main Outreach Project sponsors hub.
              </p>
              <Link className="podcastSponsorFlowModal__missionLink" href="/sponsors?packages=1" onClick={onClose}>
                Open mission partner packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
