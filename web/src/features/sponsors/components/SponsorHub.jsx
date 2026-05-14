"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import MissionPartnerPackagesModal from "@/features/sponsors/components/MissionPartnerPackagesModal";
import MissionSponsorApplyModal from "@/features/sponsors/components/MissionSponsorApplyModal";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";
import { SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";
import { useSponsorHubCatalog } from "@/features/sponsors/hooks/useSponsorHubCatalog";

export default function SponsorHub({ supabase: supabaseProp }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sponsorCatalogRows } = useSponsorHubCatalog(supabase);
  const [missionApplyOpen, setMissionApplyOpen] = useState(false);
  const [missionPackagesOpen, setMissionPackagesOpen] = useState(false);
  const [missionApplyTierId, setMissionApplyTierId] = useState(SPONSOR_TIERS[0]?.id);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  /** Favorites for `/sponsors` only — `sponsor:*` keys. Trusted (`trusted:*`) stays on `/trusted` and is preserved when saving. */
  const [sponsorFavoriteKeys, setSponsorFavoriteKeys] = useState([]);
  const nonSponsorFavoriteKeysRef = useRef([]);
  const favoriteKeySet = useMemo(
    () => new Set((sponsorFavoriteKeys || []).map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)),
    [sponsorFavoriteKeys],
  );

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
        const all =
          authed && Array.isArray(fav?.keys)
            ? [...new Set(fav.keys.map((k) => String(k || "").trim().toLowerCase()).filter(Boolean))]
            : [];
        nonSponsorFavoriteKeysRef.current = all.filter((k) => !k.startsWith("sponsor:"));
        setSponsorFavoriteKeys(all.filter((k) => k.startsWith("sponsor:")));
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          nonSponsorFavoriteKeysRef.current = [];
          setSponsorFavoriteKeys([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleSponsorFavoriteKey(key) {
    const id = String(key || "").trim().toLowerCase();
    if (!id.startsWith("sponsor:")) return;
    const prevSponsor = sponsorFavoriteKeys;
    const nextSponsor = favoriteKeySet.has(id) ? prevSponsor.filter((k) => k !== id) : [id, ...prevSponsor];
    const payloadKeys = [...new Set([...nextSponsor, ...nonSponsorFavoriteKeysRef.current])];
    setSponsorFavoriteKeys(nextSponsor);
    try {
      const res = await fetch("/api/me/favorites", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: payloadKeys }),
      });
      if (!res.ok) throw new Error("save_failed");
    } catch {
      setSponsorFavoriteKeys(prevSponsor);
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
        sponsorCatalogRows={sponsorCatalogRows}
        onOpenMissionPackages={openMissionPackages}
        onOpenMissionApply={openMissionApply}
        favoritesEnabled={isAuthenticated}
        favoriteKeySet={favoriteKeySet}
        onToggleFavorite={toggleSponsorFavoriteKey}
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
