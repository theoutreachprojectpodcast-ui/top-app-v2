/**
 * Local demo credential storage for email/password sign-in.
 * Replace with Supabase Auth (signInWithPassword, OAuth) and remove this module.
 */
import { DEMO_ACCOUNT_KEY } from "@/lib/constants";
import { loadJson, saveJson } from "@/lib/storage";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function readDemoAccount() {
  const raw = loadJson(DEMO_ACCOUNT_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const email = normalizeEmail(raw.email);
  const password = String(raw.password || "");
  if (!email || !password) return null;
  return { email, password };
}

export function writeDemoAccount(email, password) {
  saveJson(DEMO_ACCOUNT_KEY, {
    email: normalizeEmail(email),
    password: String(password || ""),
  });
}

export function clearDemoAccount() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_ACCOUNT_KEY);
  } catch {
    /* ignore */
  }
}

export function demoCredentialsMatch(email, password) {
  const acct = readDemoAccount();
  if (!acct) return false;
  return acct.email === normalizeEmail(email) && acct.password === String(password);
}
