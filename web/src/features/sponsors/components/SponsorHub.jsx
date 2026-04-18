"use client";

import { useState } from "react";
import BecomeASponsorPage from "@/features/sponsors/components/BecomeASponsorPage";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorHub({ supabase }) {
  const [step, setStep] = useState("landing");
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);

  return (
    <>
      {step === "landing" ? (
        <SponsorsLandingPage onExploreOptions={() => setStep("options")} />
      ) : (
        <BecomeASponsorPage
          supabase={supabase}
          selectedTierId={selectedTierId}
          onSelectTier={setSelectedTierId}
        />
      )}
    </>
  );
}

