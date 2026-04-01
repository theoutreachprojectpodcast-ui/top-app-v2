"use client";

import { useState } from "react";
import BecomeASponsorPage from "@/features/sponsors/components/BecomeASponsorPage";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorHub({ supabase }) {
  const [step, setStep] = useState("landing");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);

  return (
    <>
      {step === "landing" ? (
        <SponsorsLandingPage onExploreOptions={() => setStep("options")} />
      ) : (
        <BecomeASponsorPage
          selectedTierId={selectedTierId}
          onSelectTier={setSelectedTierId}
          onBack={() => setStep("landing")}
          onOpenApplication={() => setApplicationOpen(true)}
        />
      )}

      {applicationOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="sponsor-app-title" onClick={() => setApplicationOpen(false)}>
          <div className="modalCard sponsorApplyModal" onClick={(e) => e.stopPropagation()}>
            <div className="sponsorApplyModalHead">
              <h3 id="sponsor-app-title">Sponsor application</h3>
              <button className="btnSoft sponsorModalClose" type="button" onClick={() => setApplicationOpen(false)}>
                Close
              </button>
            </div>
            <SponsorApplicationForm
              supabase={supabase}
              selectedTierId={selectedTierId}
              onSelectTier={setSelectedTierId}
              onClose={() => setApplicationOpen(false)}
              variant="modal"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

