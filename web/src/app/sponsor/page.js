"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SponsorMembershipRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("packages", "1");
    const tier = searchParams.get("tier");
    const mobileReturn = searchParams.get("mobileReturn");
    if (tier) params.set("tier", tier);
    if (mobileReturn) params.set("mobileReturn", mobileReturn);
    router.replace(`/sponsors?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <main className="shell">
      <p>Opening sponsor membership…</p>
    </main>
  );
}

/** Sponsor membership entry — packages and applications live on /sponsors. */
export default function SponsorMembershipPage() {
  return (
    <Suspense fallback={<main className="shell"><p>Opening sponsor membership…</p></main>}>
      <SponsorMembershipRedirect />
    </Suspense>
  );
}
