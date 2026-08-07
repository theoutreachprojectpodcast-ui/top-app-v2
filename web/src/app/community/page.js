import { Suspense } from "react";
import NativeCommunityRoute from "@/components/mobile/NativeCommunityRoute";

export default function CommunityPageRoute() {
  return (
    <Suspense fallback={null}>
      <NativeCommunityRoute />
    </Suspense>
  );
}
