"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listSponsorsCatalog, mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";
import { getSupabaseClient } from "@/lib/supabase/client";
import MissionPartnerPackagesModal from "@/features/sponsors/components/MissionPartnerPackagesModal";
import MissionSponsorApplyModal from "@/features/sponsors/components/MissionSponsorApplyModal";
import SponsorAdminEditorSection from "@/features/sponsors/components/SponsorAdminEditorSection";
import SponsorAdminReviewSection from "@/features/sponsors/components/SponsorAdminReviewSection";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorHub({ supabase: supabaseProp }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sponsors, setSponsors] = useState([]);
  const [missionApplyOpen, setMissionApplyOpen] = useState(false);
  const [missionPackagesOpen, setMissionPackagesOpen] = useState(false);
  const [missionApplyTierId, setMissionApplyTierId] = useState(SPONSOR_TIERS[0]?.id);
  const [showSponsorAdmin, setShowSponsorAdmin] = useState(false);

  async function loadSponsors() {
    const rows = await listSponsorsCatalog(supabase);
    setSponsors(rows);
  }

  useEffect(() => {
    loadSponsors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/sponsor-applications", { credentials: "include" });
        if (!cancelled) setShowSponsorAdmin(res.ok);
      } catch {
        if (!cancelled) setShowSponsorAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tier = searchParams.get("tier");
    if (tier && SPONSOR_TIERS.some((t) => t.id === tier)) {
      setMissionApplyTierId(tier);
    }
  }, [searchParams]);

  useEffect(() => {
    const apply = searchParams.get("apply") === "1";
    const packages = searchParams.get("packages") === "1";
    if (apply) {
      setMissionApplyOpen(true);
      setMissionPackagesOpen(false);
    } else if (packages) {
      setMissionPackagesOpen(true);
      setMissionApplyOpen(false);
    }
  }, [searchParams]);

  function clearModalQueries() {
    if (!searchParams.get("apply") && !searchParams.get("packages") && !searchParams.get("tier")) return;
    router.replace("/sponsors", { scroll: false });
  }

  function openMissionPackages() {
    setMissionPackagesOpen(true);
    setMissionApplyOpen(false);
  }

  function closeMissionPackages() {
    setMissionPackagesOpen(false);
    clearModalQueries();
  }

  function openMissionApply(tierId) {
    if (tierId && SPONSOR_TIERS.some((t) => t.id === tierId)) {
      setMissionApplyTierId(tierId);
    }
    setMissionPackagesOpen(false);
    setMissionApplyOpen(true);
  }

  function closeMissionApply() {
    setMissionApplyOpen(false);
    clearModalQueries();
  }

  return (
    <>
      <SponsorsLandingPage
        sponsors={mapSponsorsToCardModels(sponsors)}
        onOpenMissionPackages={openMissionPackages}
        onOpenMissionApply={openMissionApply}
      />
      {showSponsorAdmin ? <hr className="sponsorAdminDivider" aria-hidden="true" /> : null}
      <SponsorAdminEditorSection showAdmin={showSponsorAdmin} supabase={supabase} sponsors={sponsors} onSaved={loadSponsors} />
      <SponsorAdminReviewSection showAdmin={showSponsorAdmin} supabase={supabase} />
      <MissionPartnerPackagesModal
        open={missionPackagesOpen}
        onClose={closeMissionPackages}
        onRequestApply={(tierId) => openMissionApply(tierId)}
        initialTierId={searchParams.get("tier") || undefined}
      />
      <MissionSponsorApplyModal
        open={missionApplyOpen}
        onClose={closeMissionApply}
        initialTierId={missionApplyTierId}
        supabase={supabase}
      />
    </>
  );
}
