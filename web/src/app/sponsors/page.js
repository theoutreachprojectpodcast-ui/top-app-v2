import { Suspense } from "react";
import SponsorHub from "@/features/sponsors/components/SponsorHub";

function SponsorsFallback() {
  return (
    <div className="sponsorPage sponsorLanding">
      <section className="card sponsorSection">
        <p className="sponsorSectionLead">Loading sponsors…</p>
      </section>
    </div>
  );
}

export default function SponsorsPage() {
  return (
    <Suspense fallback={<SponsorsFallback />}>
      <SponsorHub />
    </Suspense>
  );
}
