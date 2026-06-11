"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import "@/styles/mobile-splash-page.css";

/** Same-origin POST for browsers (200 HTML bridge — reliable PKCE commit). */
const WEB_HANDOFF_ACTION = "/auth/workos-handoff";

function paramsFromSearchParams(searchParams) {
  const raw = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function WorkOSAuthHandoffInner({ mode, backHref = "/mobile", fallbackReturn }) {
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
      });
      void launchWorkOSAuth(go).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start secure sign in.");
      });
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = WEB_HANDOFF_ACTION;
    form.style.display = "none";

    const add = (name, value) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    add("_mode", mode === "signup" ? "signup" : "signin");
    add("_fallbackReturn", fallbackReturn || "");
    add("_backHref", backHref);
    for (const [key, value] of Object.entries(params)) {
      if (value != null) add(key, String(value));
    }

    document.body.appendChild(form);
    form.submit();
  }, [native, mode, paramKey, fallbackReturn, backHref, searchParams]);

  if (error) {
    return (
      <div className="mobileSplashPage">
        <div className="mobileSplashPage__inner">
          <p className="mobileSplashPage__notice mobileSplashPage__notice--warn" role="alert">
            {error}
          </p>
          <p className="mobileSplashPage__lead">
            <a href={backHref}>Back</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobileSplashPage">
      <div className="mobileSplashPage__inner">
        <p className="mobileSplashPage__lead">Preparing secure sign in…</p>
      </div>
    </div>
  );
}

/**
 * @param {{ mode?: "signin" | "signup", backHref?: string, fallbackReturn?: string }} props
 */
export default function WorkOSAuthHandoffClient({ mode = "signin", backHref = "/mobile", fallbackReturn }) {
  return (
    <Suspense
      fallback={
        <div className="mobileSplashPage">
          <div className="mobileSplashPage__inner">
            <p className="mobileSplashPage__lead">Loading…</p>
          </div>
        </div>
      }
    >
      <WorkOSAuthHandoffInner mode={mode} backHref={backHref} fallbackReturn={fallbackReturn} />
    </Suspense>
  );
}
