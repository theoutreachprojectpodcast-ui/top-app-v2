"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorOpportunitiesPanel from "@/features/sponsors/components/SponsorOpportunitiesPanel";
import SponsorTierComparison from "@/features/sponsors/components/SponsorTierComparison";
import SponsorTimeline from "@/features/sponsors/components/SponsorTimeline";
import {
  MAIN_APP_SPONSOR_PACKAGE_TIERS,
  getSponsorPackageById,
} from "@/features/sponsors/data/allSponsorPackages";
import {
  FOUNDATIONAL_SPONSOR_TIERS,
  IMPACT_SPONSOR_TIERS,
  MISSION_PARTNER_TIERS,
} from "@/features/sponsors/data/sponsorTiers";
import { SPONSOR_DISPLAY_GROUP_SECTION_LEAD } from "@/features/sponsors/domain/sponsorDisplayGroups";
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
  const [tierId, setTierId] = useState(initialTierId || MAIN_APP_SPONSOR_PACKAGE_TIERS[0]?.id);
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
            <h3 id="become-sponsor-title">Apply to be a sponsor</h3>
            <p className="missionPartnerPackagesModal__sub">
              Mission partner, foundational, and impact packages for the main Outreach Project platform. Podcast sponsor
              options are available on the Podcast hub only.
            </p>
          </div>
          <button type="button" className="btnSoft missionPartnerPackagesModal__close becomeSponsorModal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="missionPartnerPackagesModal__body becomeSponsorModal__body">
          <SponsorTimeline />

          <SponsorOpportunitiesPanel checkoutReturnPath="/sponsors" onSelectTier={setTierId} programScope="main" />

          <SponsorTierComparison
            tiers={MISSION_PARTNER_TIERS}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            title="Mission partner sponsors"
            lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.mission_partner}
            familyTitle="Mission partner packages"
            familyDescription="Application + review. Billing is coordinated after approval."
            compareHref="/sponsors?apply=1"
          />

          <SponsorTierComparison
            tiers={FOUNDATIONAL_SPONSOR_TIERS}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            title="Foundational sponsors"
            lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.foundational}
            familyTitle="Foundational sponsor program"
            familyDescription="Core platform partners with structured onboarding."
            compareHref="/sponsors?apply=1"
          />

          <SponsorTierComparison
            tiers={IMPACT_SPONSOR_TIERS}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            title="Impact sponsors"
            lead={SPONSOR_DISPLAY_GROUP_SECTION_LEAD.impact}
            familyTitle="Impact sponsor program"
            familyDescription="Regional and program-focused platform visibility."
            compareHref="/sponsors?apply=1"
          />

          <SponsorApplicationForm
            supabase={supabase}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            variant="modal"
            packageScope="main"
            tiers={MAIN_APP_SPONSOR_PACKAGE_TIERS}
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
