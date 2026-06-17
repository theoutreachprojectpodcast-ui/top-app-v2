"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { hasMobileAppAccess } from "@/lib/membership/appAccess";
import { readNavAuthCache, writeNavAuthCache } from "@/lib/auth/navAuthCache";
import { mergeAccountEmailIntoProfileDto, profileFromApiDto } from "@/features/profile/mappers";
import AuthLoadingOverlay from "@/components/auth/AuthLoadingOverlay";

const COMPLETE_STALL_MS = 10_000;
const ME_TIMEOUT_MS = 8_000;
const ME_RETRY_MS = [0, 100, 250, 500];

async function fetchMeOnce() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ME_TIMEOUT_MS);
  try {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Post-OAuth landing — confirm session with a fast /api/me, route home immediately,
 * hydrate profile in the background (do not block on saved-orgs / full profile init).
 */
export default function MobileAuthCompleteClient() {
  const router = useRouter();
  const { refresh } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("complete");
  const ranRef = useRef(false);

  const handleRetry = useCallback(() => {
    setError("");
    ranRef.current = false;
    router.replace("/mobile");
  }, [router]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    void (async () => {
      setPhase("verify");
      let me = null;

      for (const delay of ME_RETRY_MS) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const data = await fetchMeOnce();
          if (data?.authenticated) {
            me = data;
            break;
          }
        } catch {
          /* cookie may not be visible yet — retry */
        }
      }

      if (!me?.authenticated) {
        await refresh({ soft: true });
        if (!readNavAuthCache()?.authenticated) {
          setError(
            "Sign-in did not complete. If email verification failed, request a new code and try again.",
          );
          return;
        }
      }

      if (me?.authenticated) {
        const ents = me.entitlements && typeof me.entitlements === "object" ? me.entitlements : {};
        const opts = {
          isPlatformAdmin: !!ents.isPlatformAdmin,
          isPrivilegedStaff: !!ents.isPrivilegedStaff,
        };
        const profile = me.profile
          ? profileFromApiDto(mergeAccountEmailIntoProfileDto(me.profile, me.user))
          : null;
        writeNavAuthCache(true, true, {
          hasFreeAccess: hasMobileAppAccess(profile, opts),
        });
      }

      router.replace("/");

      void refresh({ soft: true });
      void refreshWorkOSProfile();
    })();
  }, [refresh, refreshWorkOSProfile, router]);

  useEffect(() => {
    if (error) return undefined;
    const timer = window.setTimeout(() => {
      if (!error) {
        setError(
          "Sign-in is taking longer than expected. Your verification code may have expired — try again.",
        );
      }
    }, COMPLETE_STALL_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  return (
    <AuthLoadingOverlay
      visible
      variant={phase === "verify" ? "authVerify" : "authComplete"}
      error={!!error}
      errorMessage={error}
      onRetry={error ? handleRetry : undefined}
    />
  );
}
