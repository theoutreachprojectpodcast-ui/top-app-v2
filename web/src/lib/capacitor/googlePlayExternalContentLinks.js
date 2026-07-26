"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

const PLUGIN_NAME = "GooglePlayExternalContentLinks";
const GooglePlayExternalContentLinks = registerPlugin(PLUGIN_NAME);

/**
 * True only inside an Android shell that actually contains the native Play bridge.
 * Version 6 does not contain it; version 7+ does. This keeps the closed-test rollout safe while
 * the server independently fails closed for shells tagged `GooglePlayECL/1`.
 */
export function requiresGooglePlayExternalContentLink() {
  if (typeof window === "undefined") return false;
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android" &&
      Capacitor.isPluginAvailable(PLUGIN_NAME)
    );
  } catch {
    return false;
  }
}

/**
 * Ask Google Play to confirm eligibility and generate a fresh, single-attempt transaction token.
 * Tokens are never cached and must be created immediately before each external checkout link.
 */
export async function prepareGooglePlayExternalContentLink() {
  if (!requiresGooglePlayExternalContentLink()) {
    return { required: false, externalTransactionToken: "" };
  }

  const result = await GooglePlayExternalContentLinks.prepare();
  const externalTransactionToken = String(result?.externalTransactionToken || "").trim();
  if (!externalTransactionToken) {
    const error = new Error("Google Play did not return an external checkout token. Please try again.");
    error.code = "GOOGLE_PLAY_ECL_INVALID_TOKEN";
    throw error;
  }

  return { required: true, externalTransactionToken };
}

/**
 * Show Google Play's required information screen and let Play open the TOP-owned checkout handoff
 * in an external browser. The native plugin rejects all other domains and paths.
 */
export async function launchGooglePlayExternalContentLink({ url, externalTransactionToken }) {
  if (!requiresGooglePlayExternalContentLink()) {
    return { required: false, launched: false };
  }

  const target = String(url || "").trim();
  const token = String(externalTransactionToken || "").trim();
  if (!target || !token) {
    const error = new Error("The Google Play checkout handoff is incomplete. Please try again.");
    error.code = "GOOGLE_PLAY_ECL_INCOMPLETE_HANDOFF";
    throw error;
  }

  const result = await GooglePlayExternalContentLinks.launch({
    url: target,
    externalTransactionToken: token,
  });
  return { required: true, launched: !!result?.launched };
}

export function googlePlayExternalContentLinkErrorMessage(error) {
  const code = String(error?.code || "").trim();
  if (code === "GOOGLE_PLAY_ECL_BILLING_UNAVAILABLE") {
    return "Google Play has not enabled external checkout for this account yet. Confirm External content links enrollment, then try again.";
  }
  if (code === "GOOGLE_PLAY_ECL_CANCELED") {
    return "Checkout was canceled before the browser opened.";
  }
  if (code === "GOOGLE_PLAY_ECL_NOT_SUPPORTED") {
    return "Update the Google Play Store on this device, then try checkout again.";
  }
  if (code === "GOOGLE_PLAY_ECL_TEMPORARY_ERROR") {
    return "Google Play could not be reached. Check your connection and try again.";
  }
  return String(error?.message || "Google Play could not open the secure checkout. Please try again.");
}
