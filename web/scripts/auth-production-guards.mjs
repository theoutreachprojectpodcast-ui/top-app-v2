/**
 * Regression guards for production web auth — run in CI (`pnpm --dir web run verify:auth-freeze`).
 * Do not change these invariants without explicit review; they fixed live prod sign-in (2026-06).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(rel) {
  return readFile(path.join(webRoot, rel), "utf8");
}

const pkceSrc = await read("src/lib/auth/workosAuthorizationRedirect.js");
assert.match(
  pkceSrc,
  /export const WORKOS_PKCE_COOKIE_NAME = "wos-auth-verifier"/,
  "PKCE cookie must remain wos-auth-verifier (AuthKit v3)",
);
assert.doesNotMatch(
  pkceSrc,
  /wos-auth-verifier-\$\{/,
  "Do not reintroduce hashed PKCE cookie suffixes",
);

const callbackHandler = await read("src/lib/auth/workosCallbackHandler.js");
assert.match(
  callbackHandler,
  /return patchNativeShellCallbackRedirect\(request, response\)/,
  "Document callback must return AuthKit response directly (session cookies)",
);
assert.doesNotMatch(
  callbackHandler,
  /buildMobileOAuthCallbackDeepLink/,
  "Do not deep-link mobile Safari from document callback",
);

const goRoute = await read("src/lib/auth/workosGoRoute.js");
assert.match(
  goRoute,
  /workOSAuthorizeBridgeFromBundle\(bundle, markNative\)/,
  "Sign-in bridge must attach PKCE via workOSAuthorizeBridgeFromBundle",
);

const callbackRequest = await read("src/lib/auth/workosCallbackRequest.js");
assert.match(
  callbackRequest,
  /x-top-callback-fetch/i,
  "JSON callback must use x-top-callback-fetch header (not Accept sniffing)",
);

console.log("[verify:auth-freeze] OK — production web auth invariants intact");
