"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TOP_OAUTH_HANDOFF_ERROR } from "@/lib/auth/oauthMobileHandoff";

/**
 * Surfaces OAuth handoff failures (poll timeout, incomplete session transfer) with retry.
 */
export default function MobileOAuthHandoffError() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isCapacitorNative() || typeof sessionStorage === "undefined") return;
    const err = String(sessionStorage.getItem(TOP_OAUTH_HANDOFF_ERROR) || "").trim();
    if (err) {
      setMessage(err);
      sessionStorage.removeItem(TOP_OAUTH_HANDOFF_ERROR);
    }
  }, []);

  if (!message) return null;

  return (
    <div className="mobileOAuthHandoffError" role="alert">
      <p className="mobileOAuthHandoffError__text">{message}</p>
      <div className="mobileOAuthHandoffError__actions">
        <button
          type="button"
          className="btnPrimary"
          onClick={() => {
            setMessage("");
            router.push("/sign-in");
          }}
        >
          Sign in again
        </button>
        <button type="button" className="btnSoft" onClick={() => setMessage("")}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
