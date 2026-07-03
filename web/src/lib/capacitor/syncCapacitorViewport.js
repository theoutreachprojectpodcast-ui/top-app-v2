import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { lockPortraitOrientation } from "@/lib/capacitor/lockPortraitOrientation";
import { isCapacitorNative } from "@/lib/capacitor/platform";

const PORTRAIT_WIDTH_KEY = "top.cap.portraitWidth";
const SYNC_DELAYS_MS = [0, 120, 320];

let installed = false;
let syncTimer = null;

function readPortraitWidth() {
  if (typeof window === "undefined") return 390;
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  return Math.min(w || 390, h || w || 390);
}

function readPortraitHeight() {
  if (typeof window === "undefined") return 844;
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  return Math.max(w, h || w || 844);
}

function rememberPortraitWidth(width) {
  try {
    sessionStorage.setItem(PORTRAIT_WIDTH_KEY, String(Math.round(width)));
  } catch {
    /* private mode / disabled storage */
  }
}

function recalledPortraitWidth() {
  try {
    const raw = sessionStorage.getItem(PORTRAIT_WIDTH_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 320 && parsed <= 520) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Pin layout tokens to portrait logical size so transient landscape width does not
 * inflate vw-based typography, then nudge dependent hooks to recalculate.
 */
export function syncCapacitorViewport({ lockPortrait = true } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isCapacitorNative()) return;

  const root = document.documentElement;
  const livePortraitWidth = readPortraitWidth();
  const livePortraitHeight = readPortraitHeight();
  const isPortrait = (window.innerWidth || 0) <= (window.innerHeight || 0);

  if (isPortrait) {
    rememberPortraitWidth(livePortraitWidth);
  }

  const layoutWidth = isPortrait ? livePortraitWidth : recalledPortraitWidth() || livePortraitWidth;
  const layoutHeight = isPortrait ? livePortraitHeight : recalledPortraitWidth()
    ? Math.max(livePortraitHeight, layoutWidth * 2)
    : livePortraitHeight;

  root.dataset.capOrientation = isPortrait ? "portrait" : "landscape";
  root.style.setProperty("--cap-vw", `${layoutWidth * 0.01}px`);
  root.style.setProperty("--cap-vh", `${layoutHeight * 0.01}px`);
  root.style.setProperty("--cap-portrait-width", `${layoutWidth}px`);
  root.style.setProperty("--cap-portrait-height", `${layoutHeight}px`);
  root.style.setProperty("--cap-app-height", `${isPortrait ? window.innerHeight : layoutHeight}px`);

  // Force style/layout recalc after orientation transitions.
  void root.offsetHeight;
  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new CustomEvent("capacitor:viewport-sync"));

  if (lockPortrait) {
    void lockPortraitOrientation();
  }
}

export function scheduleCapacitorViewportSync(options = {}) {
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    for (const delay of SYNC_DELAYS_MS) {
      window.setTimeout(() => syncCapacitorViewport(options), delay);
    }
  }, 0);
}

export function installCapacitorViewportSync() {
  if (typeof window === "undefined" || installed) return () => {};
  if (!isCapacitorNative()) return () => {};

  installed = true;

  const onChange = () => scheduleCapacitorViewportSync();
  syncCapacitorViewport();

  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
  window.addEventListener("focus", onChange);
  window.visualViewport?.addEventListener("resize", onChange);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleCapacitorViewportSync();
  });

  let appStateListener;
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) scheduleCapacitorViewportSync();
  }).then((handle) => {
    appStateListener = handle;
  });

  let orientationListener;
  void ScreenOrientation.addListener("screenOrientationChange", onChange).then((handle) => {
    orientationListener = handle;
  });

  return () => {
    installed = false;
    window.removeEventListener("orientationchange", onChange);
    window.removeEventListener("resize", onChange);
    window.removeEventListener("focus", onChange);
    window.visualViewport?.removeEventListener("resize", onChange);
    void appStateListener?.remove();
    void orientationListener?.remove();
  };
}
