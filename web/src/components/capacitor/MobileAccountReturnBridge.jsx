"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNativeWebAccountFlow } from "@/hooks/useNativeWebAccountFlow";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Refreshes WorkOS profile + session when returning from external web signup/billing,
 * and handles deep links back into the native shell.
 */
export default function MobileAccountReturnBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refreshAccountStatus, refreshing, refreshError, nativeExternalFlow } = useNativeWebAccountFlow();
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const removeFinished = Browser.addListener("browserFinished", () => {
      void refreshAccountStatus().then((result) => {
        if (result.ok) setBanner("Account updated. Your membership status has been refreshed.");
      });
    });

    const removeAppUrl = App.addListener("appUrlOpen", (event) => {
      const url = String(event?.url || "");
      if (!url.includes("account/refresh")) return;
      void refreshAccountStatus().then((result) => {
        if (result.ok) {
          setBanner("Welcome back. Your account status is up to date.");
          router.replace("/profile?mobileReturn=account");
        }
      });
    });

    const removeState = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      void refreshAccountStatus();
    });

    return () => {
      void removeFinished.then((h) => h.remove());
      void removeAppUrl.then((h) => h.remove());
      void removeState.then((h) => h.remove());
    };
  }, [refreshAccountStatus, router]);

  useEffect(() => {
    const mobileReturn = searchParams.get("mobileReturn");
    const checkout = searchParams.get("checkout");
    const paymentMethod = searchParams.get("payment_method");
    const shouldRefresh =
      mobileReturn === "account" ||
      checkout === "success" ||
      checkout === "cancel" ||
      paymentMethod === "success" ||
      paymentMethod === "cancel";
    if (!shouldRefresh || !nativeExternalFlow) return;

    let cancelled = false;
    (async () => {
      const result = await refreshAccountStatus();
      if (cancelled) return;
      if (result.ok) {
        if (checkout === "success" || paymentMethod === "success") {
          setBanner("Payment completed on the web. Your membership has been refreshed in the app.");
        } else if (mobileReturn === "account") {
          setBanner("Account synced from the web.");
        }
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete("mobileReturn");
      next.delete("checkout");
      next.delete("payment_method");
      next.delete("session_id");
      const q = next.toString();
      router.replace(`${pathname || "/"}${q ? `?${q}` : ""}`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, refreshAccountStatus, nativeExternalFlow]);

  if (!nativeExternalFlow) return null;

  return (
    <div className="mobileAccountReturnBridge" aria-live="polite">
      {(banner || refreshError) && (
        <div className={`mobileAccountReturnBridge__banner${refreshError ? " mobileAccountReturnBridge__banner--error" : ""}`}>
          <p>{refreshError || banner}</p>
          <div className="row wrap">
            <button
              type="button"
              className="btnSoft"
              disabled={refreshing}
              onClick={() => {
                setBanner("");
                void refreshAccountStatus();
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh account status"}
            </button>
            {banner ? (
              <button type="button" className="btnSoft" onClick={() => setBanner("")}>
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      )}
      {!banner && !refreshError ? (
        <button
          type="button"
          className="mobileAccountReturnBridge__refreshLink"
          disabled={refreshing}
          onClick={() => void refreshAccountStatus()}
        >
          {refreshing ? "Refreshing account…" : "Refresh account status"}
        </button>
      ) : null}
    </div>
  );
}
