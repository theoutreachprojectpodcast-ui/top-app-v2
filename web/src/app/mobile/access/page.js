import { Suspense } from "react";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";
import MobileAccessPaywall from "@/components/mobile/MobileAccessPaywall";

export const metadata = {
  title: "App Access — The Outreach Project",
  description: "Activate App Access membership for the mobile app.",
};

export default function MobileAccessPage() {
  return (
    <Suspense fallback={<AuthLoadingOverlay visible variant="generic" />}>
      <MobileAccessPaywall />
    </Suspense>
  );
}
