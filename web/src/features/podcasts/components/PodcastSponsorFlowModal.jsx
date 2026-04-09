"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import {
  PODCAST_PLACEMENT_OPTIONS,
  PODCAST_SPONSOR_TIERS,
  SPONSOR_PROGRAM_TYPE_PODCAST,
} from "@/features/sponsors/data/podcastSponsorTiers";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function PodcastSponsorFlowModal({ open, onClose, supabase: supabaseProp, initialTierId }) {
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
    <div className="modalOverlay podcastModalOverlay podcastSponsorFlowOverlay" role="dialog" aria-modal="true" aria-labelledby="podcast-sponsor-flow-title" onClick={onClose}>
      <div className="modalCard podcastModalCard podcastSponsorFlowModal" onClick={(e) => e.stopPropagation()}>
        <div className="podcastScope">
          <div className="podcastSponsorFlowModal__head">
            <div>
              <p className="podcastEyebrow">Podcast sponsors</p>
              <h2 id="podcast-sponsor-flow-title" className="podcastSectionTitle">Sponsor the show</h2>
              <p className="podcastSectionSubtitle">Pick a tier, review full placements and benefits, then apply. Mission partner packages open in a popup from the main Sponsors page.</p>
            </div>
            <button type="button" className="btnSoft" onClick={onClose}>
              Close
            </button>
          </div>

          <SponsorTierComparison
            tiers={PODCAST_SPONSOR_TIERS}
            variant="podcast"
            selectedTierId={tierId}
            onSelectTier={setTierId}
            title="Podcast sponsor tiers"
            lead="Community Sponsor, Impact Sponsor, and Foundational — podcast channels only."
            familyTitle="Select your package"
            compareHref="/podcasts"
          />

          <SponsorApplicationForm
            supabase={supabase}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            variant="modal"
            programType={SPONSOR_PROGRAM_TYPE_PODCAST}
            tiers={PODCAST_SPONSOR_TIERS}
            placementOptions={PODCAST_PLACEMENT_OPTIONS}
            onSuccessfulSubmit={onClose}
          />

          <div className="row wrap podcastSponsorFlowModal__foot">
            <Link className="btnSoft" href="/sponsors?packages=1" onClick={onClose}>
              Mission partner packages
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
