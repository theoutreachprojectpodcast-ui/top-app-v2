"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import WorkOSAuthShell from "@/components/auth/WorkOSAuthShell";

function paramsFromSearchParams(searchParams) {
  const raw = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function WorkOSAuthHandoffInner({ mode, backHref = "/", fallbackReturn }) {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const native = isCapacitorNative();

  const paramKey = searchParams.toString();

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = paramsFromSearchParams(searchParams);
    if (!params.returnTo && fallbackReturn) {
      params.returnTo = fallbackReturn;
    }

    if (native) {
      const returnTo = params.returnTo || fallbackReturn || (mode === "signup" ? "/onboarding" : "/community");
      const go = workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
        native: true,
      });
      void launchWorkOSAuth(go).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start secure sign in.");
      });
      return;
    }

    const returnTo = params.returnTo || fallbackReturn || (mode === "signup" ? "/onboarding" : "/");
    window.location.assign(
      workosGoUrl({
        mode: mode === "signup" ? "signup" : "signin",
        returnTo,
        rememberDevice: params.remember !== "0",
        loginHint: params.loginHint,
      }),
    );
  }, [native, mode, paramKey, fallbackReturn, backHref, searchParams]);

  if (error) {
    return (
      <WorkOSAuthShell title="Sign in" error={error}>
        <p className="workosAuthShell__lead">
          <a href={backHref}>Back</a>
        </p>
      </WorkOSAuthShell>
    );
  }

  return (
    <WorkOSAuthShell
      title="Sign in"
      lead="Preparing secure sign in…"
      busy
    />
  );
}

/**
 * @param {{ mode?: "signin" | "signup", backHref?: string, fallbackReturn?: string }} props
 */
export default function WorkOSAuthHandoffClient({ mode = "signin", backHref = "/", fallbackReturn }) {
  return (
    <Suspense fallback={<WorkOSAuthShell title="Sign in" lead="Loading…" busy />}>
      <WorkOSAuthHandoffInner mode={mode} backHref={backHref} fallbackReturn={fallbackReturn} />
    </Suspense>
  );
}
