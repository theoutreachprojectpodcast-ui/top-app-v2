"use client";

import { useEffect, useMemo, useState } from "react";
import SponsorApplicationForm from "@/features/sponsors/components/SponsorApplicationForm";
import SponsorTimeline from "@/features/sponsors/components/SponsorTimeline";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function MissionSponsorApplyModal({ open, onClose, initialTierId, supabase: supabaseProp }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const [tierId, setTierId] = useState(initialTierId || SPONSOR_TIERS[0]?.id);

  useEffect(() => {
    if (!open) return;
    if (initialTierId && SPONSOR_TIERS.some((t) => t.id === initialTierId)) {
      setTierId(initialTierId);
    }
  }, [open, initialTierId]);

  if (!open) return null;

  return (
    <div className="modalOverlay missionSponsorModalOverlay" role="dialog" aria-modal="true" aria-labelledby="mission-sponsor-apply-title" onClick={onClose}>
      <div className="modalCard missionSponsorApplyModal" onClick={(e) => e.stopPropagation()}>
        <div className="missionSponsorApplyModal__head">
          <div>
            <h3 id="mission-sponsor-apply-title">Become a mission partner</h3>
            <p className="missionSponsorApplyModal__sub">Complete the steps below. You can change your package in the form before you submit.</p>
          </div>
          <button type="button" className="btnSoft missionSponsorApplyModal__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="missionSponsorApplyModal__body">
          <SponsorTimeline />
          <SponsorApplicationForm
            supabase={supabase}
            selectedTierId={tierId}
            onSelectTier={setTierId}
            variant="modal"
            onSuccessfulSubmit={onClose}
          />
        </div>
      </div>
    </div>
  );
}
