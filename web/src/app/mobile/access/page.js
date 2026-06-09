import { Suspense } from "react";
import MobileAccessPaywall from "@/components/mobile/MobileAccessPaywall";

export const metadata = {
  title: "App Access — The Outreach Project",
  description: "Activate App Access membership for the mobile app.",
};

function MobileAccessFallback() {
  return (
    <div className="mobileSplashPage">
      <div className="mobileSplashPage__inner">
        <p className="mobileSplashPage__lead">Loading…</p>
      </div>
    </div>
  );
}

export default function MobileAccessPage() {
  return (
    <Suspense fallback={<MobileAccessFallback />}>
      <MobileAccessPaywall />
    </Suspense>
  );
}
