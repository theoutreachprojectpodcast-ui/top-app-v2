"use client";

import { useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import {
  MOBILE_MEMBERSHIP_PAYWALL_PATH,
  WEB_MEMBERSHIP_PAYWALL_PATH,
} from "@/lib/membership/protectedRoutes";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";

/**
 * Shown when a Support member (or signed-in user) hits a Pro-only surface.
 * @param {{ title?: string, message?: string, feature?: string }} props
 */
export default function MembershipUpgradePrompt({
  title = "Upgrade to Pro",
  message = "This feature is included with Pro Membership.",
  feature = "",
}) {
  const router = useRouter();
  const paywall = isCapacitorNative() ? MOBILE_MEMBERSHIP_PAYWALL_PATH : WEB_MEMBERSHIP_PAYWALL_PATH;

  return (
    <div className="membershipUpgradePrompt" role="region" aria-label={title}>
      <h2 className="membershipUpgradePrompt__title">{title}</h2>
      <p className="membershipUpgradePrompt__lead">
        {message}
        {feature ? ` (${feature})` : ""}
      </p>
      <p className="membershipUpgradePrompt__meta">
        {PRO_MEMBERSHIP_DISPLAY_NAME} — {PRO_MEMBERSHIP_PRICE_LABEL}
      </p>
      <div className="membershipUpgradePrompt__actions">
        <button type="button" className="btnPrimary" onClick={() => router.push(`${paywall}?upgrade=pro`)}>
          Upgrade to Pro
        </button>
        <button type="button" className="btnSoft" onClick={() => router.back()}>
          Go back
        </button>
      </div>
    </div>
  );
}
