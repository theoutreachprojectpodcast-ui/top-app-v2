"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listSponsorsCatalog, mapSponsorsToCardModels } from "@/features/sponsors/api/sponsorCatalogApi";
import { getSupabaseClient } from "@/lib/supabase/client";
import MissionPartnerPackagesModal from "@/features/sponsors/components/MissionPartnerPackagesModal";
import MissionSponsorApplyModal from "@/features/sponsors/components/MissionSponsorApplyModal";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favoriteKeys, setFavoriteKeys] = useState([]);
  const favoriteKeySet = useMemo(
    () => new Set((favoriteKeys || []).map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)),
    [favoriteKeys],
  );

  async function loadSponsors() {
    const rows = await listSponsorsCatalog(supabase, { sponsorScope: "app" });
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
        const [meRes, favRes] = await Promise.all([
          fetch("/api/me", { credentials: "include", cache: "no-store" }),
          fetch("/api/me/favorites", { credentials: "include", cache: "no-store" }),
        ]);
        const me = await meRes.json().catch(() => ({}));
        const fav = await favRes.json().catch(() => ({}));
        if (cancelled) return;
        const authed = !!me?.authenticated;
        setIsAuthenticated(authed);
        setFavoriteKeys(
          authed && Array.isArray(fav?.keys)
            ? [...new Set(fav.keys.map((k) => String(k || "").trim().toLowerCase()).filter(Boolean))]
            : [],
        );
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setFavoriteKeys([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleFavoriteKey(key) {
    const id = String(key || "").trim().toLowerCase();
    if (!(id.startsWith("sponsor:") || id.startsWith("trusted:"))) return;
    const next = favoriteKeySet.has(id) ? favoriteKeys.filter((k) => k !== id) : [id, ...favoriteKeys];
    setFavoriteKeys(next);
    try {
      const res = await fetch("/api/me/favorites", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: next }),
      });
      if (!res.ok) throw new Error("save_failed");
    } catch {
      setFavoriteKeys(favoriteKeys);
    }
  }

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
        favoritesEnabled={isAuthenticated}
        favoriteKeySet={favoriteKeySet}
        onToggleFavorite={toggleFavoriteKey}
        onRequestSignIn={() => router.push("/auth/sign-in?returnTo=/sponsors")}
      />
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
