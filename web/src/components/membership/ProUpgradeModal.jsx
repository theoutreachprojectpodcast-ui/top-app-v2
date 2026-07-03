"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { membershipUpgradePaywallPath } from "@/lib/membership/protectedRoutes";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";

/**
 * Modal prompt for Support members on Pro-only surfaces.
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   message?: string,
 *   feature?: string,
 *   onBack?: () => void,
 * }} props
 */
export default function ProUpgradeModal({
  open,
  title = "Upgrade to Pro",
  message = "This feature is included with Pro Membership.",
  feature = "",
  onBack,
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  function handleBack() {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/");
  }

  function handleUpgrade() {
    router.push(membershipUpgradePaywallPath(isCapacitorNative()));
  }

  const lead = feature && !message.includes(feature) ? `${message} (${feature})` : message;

  return createPortal(
    <div
      className="modalOverlay proUpgradeModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-upgrade-modal-title"
      aria-describedby="pro-upgrade-modal-desc"
    >
      <div className="modalCard proUpgradeModal" onClick={(event) => event.stopPropagation()}>
        <h3 id="pro-upgrade-modal-title" className="proUpgradeModal__title">
          {title}
        </h3>
        <p id="pro-upgrade-modal-desc" className="proUpgradeModal__lead">
          {lead}
        </p>
        <p className="proUpgradeModal__meta">
          {PRO_MEMBERSHIP_DISPLAY_NAME} — {PRO_MEMBERSHIP_PRICE_LABEL}
        </p>
        <div className="proUpgradeModal__actions row wrap">
          <button type="button" className="btnPrimary" onClick={handleUpgrade}>
            Upgrade to Pro
          </button>
          <button type="button" className="btnSoft" onClick={handleBack}>
            Go back
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
