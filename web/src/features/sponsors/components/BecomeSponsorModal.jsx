"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorOpportunitiesPanel from "@/features/sponsors/components/SponsorOpportunitiesPanel";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import SponsorTimeline from "@/features/sponsors/components/SponsorTimeline";
import { ALL_SPONSOR_PACKAGE_TIERS, getSponsorPackageById, isPodcastSponsorPackage } from "@/features/sponsors/data/allSponsorPackages";
import { MISSION_PARTNER_TIERS } from "@/features/sponsors/data/sponsorTiers";
import { PODCAST_SPONSOR_TIERS } from "@/features/sponsors/data/podcastSponsorTiers";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function BecomeSponsorModal({
  open,
  onClose,
  initialTierId,
  supabase: supabaseProp,
  stripeReturn = null,
}) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const [tierId, setTierId] = useState(initialTierId || ALL_SPONSOR_PACKAGE_TIERS[0]?.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialTierId && getSponsorPackageById(initialTierId)) {
      setTierId(initialTierId);
    }
  }, [open, initialTierId]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const selectedTier = getSponsorPackageById(tierId);

  return createPortal(
    <div
      className="modalOverlay missionSponsorModalOverlay becomeSponsorModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="become-sponsor-title"
      onClick={onClose}
    >
      <div className="modalCard missionPartnerPackagesModal becomeSponsorModal" onClick={(e) => e.stopPropagation()}>
        <div className="becomeSponsorModal__head missionPartnerPackagesModal__head">
          <div className="becomeSponsorModal__headCopy">
            <h3 id="become-sponsor-title">Become a sponsor</h3>
            <p className="missionPartnerPackagesModal__sub">
              Compare all six sponsorship packages — three mission partners for the main platform and three podcast
              sponsors for the show — then complete one application without leaving this page.
            </p>
          </div>
          <button type="button" className="btnSoft missionPartnerPackagesModal__close becomeSponsorModal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="missionPartnerPackagesModal__body becomeSponsorModal__body">
          <SponsorTimeline />

          <SponsorOpportunitiesPanel checkoutReturnPath="/sponsors" onSelectTier={setTierId} />

          <SponsorTierComparison
            tiers={MISSION_PARTNER_TIERS}
            selectedTierId={!isPodcastSponsorPackage(selectedTier) ? tierId : ""}
            onSelectTier={setTierId}
            title="Mission partner packages"
            lead="Supporting Partner, Growth Partner, and Strategic Partner — website and ecosystem visibility."
            familyTitle="Main platform sponsors"
            familyDescription="Application + review. Billing is coordinated after approval."
            compareHref="/sponsors?apply=1"
          />

          <SponsorTierComparison
            tiers={PODCAST_SPONSOR_TIERS}
            selectedTierId={isPodcastSponsorPackage(selectedTier) ? tierId : ""}
            onSelectTier={setTierId}
            title="Podcast sponsor packages"
            lead="Community Sponsor, Impact Sponsor, and Foundational — episode-first placements on the show."
            familyTitle="Podcast sponsors"
            familyDescription="Select a tier below or in the application form. Stripe checkout is available when billing is live."
            compareHref="/sponsors?apply=1"
          />

          <SponsorApplicationForm
            supabase={supabase}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            variant="modal"
            packageScope="all"
            tiers={ALL_SPONSOR_PACKAGE_TIERS}
            checkoutReturnPath="/sponsors"
            onSuccessfulSubmit={onClose}
            stripeReturn={stripeReturn}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
