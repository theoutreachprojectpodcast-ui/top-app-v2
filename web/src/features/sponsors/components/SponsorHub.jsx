"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import BecomeSponsorModal from "@/features/sponsors/components/BecomeSponsorModal";
import SponsorsLandingPage from "@/features/sponsors/components/SponsorsLandingPage";
import {
  MAIN_APP_SPONSOR_PACKAGE_TIERS,
  getSponsorPackageById,
  isKnownMainAppSponsorPackageId,
} from "@/features/sponsors/data/allSponsorPackages";

export default function SponsorHub({ supabase: supabaseProp }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);
  const supabase = supabaseProp ?? supabaseClient;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [becomeSponsorOpen, setBecomeSponsorOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(MAIN_APP_SPONSOR_PACKAGE_TIERS[0]?.id);

  const stripeReturn = useMemo(() => {
    const checkout = searchParams.get("sponsor_checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout === "success" || checkout === "cancel") {
      return { checkout, sessionId: sessionId || "" };
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    const tier = searchParams.get("tier");
    if (tier && isKnownMainAppSponsorPackageId(tier)) {
      setSelectedTierId(tier);
    }
  }, [searchParams]);

  useEffect(() => {
    const apply = searchParams.get("apply") === "1";
    const packages = searchParams.get("packages") === "1";
    const sponsorCheckout = searchParams.get("sponsor_checkout");
    if (apply || packages || sponsorCheckout === "success" || sponsorCheckout === "cancel") {
      setBecomeSponsorOpen(true);
    }
  }, [searchParams]);

  function clearModalQueries() {
    const keys = ["apply", "packages", "tier", "sponsor_checkout", "session_id"];
    if (!keys.some((key) => searchParams.get(key))) return;
    router.replace("/sponsors", { scroll: false });
  }

  function openBecomeSponsor(tierId) {
    if (tierId && isKnownMainAppSponsorPackageId(tierId)) {
      setSelectedTierId(tierId);
    }
    setBecomeSponsorOpen(true);
  }

  function closeBecomeSponsor() {
    setBecomeSponsorOpen(false);
    clearModalQueries();
  }

  return (
    <>
      <SponsorsLandingPage
        onOpenBecomeSponsor={() => openBecomeSponsor()}
        onOpenBecomeSponsorWithTier={openBecomeSponsor}
      />
      <BecomeSponsorModal
        open={becomeSponsorOpen}
        onClose={closeBecomeSponsor}
        initialTierId={selectedTierId || getSponsorPackageById(searchParams.get("tier") || "")?.id}
        supabase={supabase}
        stripeReturn={stripeReturn}
      />
    </>
  );
}
