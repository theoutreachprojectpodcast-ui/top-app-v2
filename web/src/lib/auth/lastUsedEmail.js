/**
 * Safe client-only storage for the last email typed before WorkOS / demo sign-in.
 * Never stores passwords or tokens.
 */
export const LAST_USED_EMAIL_KEY = "torp_last_used_email";
export const REMEMBER_EMAIL_PREF_KEY = "torp_remember_email_pref";
export const REMEMBER_DEVICE_PREF_KEY = "torp_workos_remember_device";

export function readLastUsedEmail() {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage.getItem(LAST_USED_EMAIL_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeLastUsedEmail(email) {
  if (typeof window === "undefined") return;
  const e = String(email || "").trim();
  if (!e) return;
  try {
    window.localStorage.setItem(LAST_USED_EMAIL_KEY, e);
  } catch {
    /* quota / private mode */
  }
}

export function clearLastUsedEmail() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LAST_USED_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

/** @returns {boolean} default true */
export function readRememberEmailPref() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMEMBER_EMAIL_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeRememberEmailPref(on) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_EMAIL_PREF_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Stay signed in preference for WorkOS (drives prompt=login when false). Default true. */
export function readRememberDevicePref() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMEMBER_DEVICE_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeRememberDevicePref(on) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_DEVICE_PREF_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
