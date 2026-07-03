"use client";

import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

/** @deprecated Use WorkOSAuthHandoffClient — kept for imports. */
export default function MobileAuthLauncher(props) {
  return <WorkOSAuthHandoffClient {...props} />;
}
