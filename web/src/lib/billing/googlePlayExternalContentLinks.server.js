import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GOOGLE_PLAY_ECL_TOKEN_MAX_LENGTH = 6000;
const GOOGLE_PLAY_ECL_TOKEN_CHUNK_LENGTH = 450;
const HANDOFF_TTL_SECONDS = 15 * 60;
const HANDOFF_MAX_FUTURE_SECONDS = 30 * 60;

function signingSecret() {
  const value = String(
    process.env.GOOGLE_PLAY_EXTERNAL_CHECKOUT_SIGNING_SECRET ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      process.env.STRIPE_SECRET_KEY ||
      "",
  ).trim();
  if (!value) throw new Error("Google Play external checkout signing secret is unavailable");
  return value;
}

export function normalizeGooglePlayExternalTransactionToken(value) {
  const token = String(value || "").trim();
  if (!token) return "";
  if (token.length > GOOGLE_PLAY_ECL_TOKEN_MAX_LENGTH) {
    throw new Error("Google Play external transaction token exceeds the supported length");
  }
  return token;
}

/**
 * Stripe metadata values are limited to 500 characters, so the Google Play transaction token is
 * split into ordered chunks. This preserves the token for External Transactions API reporting
 * without exposing it in a URL or browser storage.
 */
export function googlePlayExternalContentLinkMetadata(value) {
  const token = normalizeGooglePlayExternalTransactionToken(value);
  if (!token) return {};

  const chunks = [];
  for (let offset = 0; offset < token.length; offset += GOOGLE_PLAY_ECL_TOKEN_CHUNK_LENGTH) {
    chunks.push(token.slice(offset, offset + GOOGLE_PLAY_ECL_TOKEN_CHUNK_LENGTH));
  }

  const metadata = {
    google_play_ecl: "1",
    google_play_ecl_version: "1",
    google_play_ecl_token_parts: String(chunks.length),
    google_play_ecl_token_sha256: createHash("sha256").update(token).digest("hex"),
  };
  chunks.forEach((chunk, index) => {
    metadata[`google_play_ecl_token_${String(index + 1).padStart(2, "0")}`] = chunk;
  });
  return metadata;
}

function handoffPayload(sessionId, expiresAt) {
  return `top-google-play-ecl-v1:${sessionId}:${expiresAt}`;
}

function handoffSignature(sessionId, expiresAt) {
  return createHmac("sha256", signingSecret())
    .update(handoffPayload(sessionId, expiresAt))
    .digest("base64url");
}

export function createGooglePlayExternalCheckoutHandoffUrl(origin, sessionId) {
  const cleanSessionId = String(sessionId || "").trim();
  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(cleanSessionId)) {
    throw new Error("Invalid Stripe Checkout Session ID for Google Play handoff");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS;
  const url = new URL("/api/billing/google-play-external-checkout", origin);
  url.searchParams.set("session", cleanSessionId);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", handoffSignature(cleanSessionId, expiresAt));
  return url.toString();
}

export function verifyGooglePlayExternalCheckoutHandoff({ sessionId, expiresAt, signature }) {
  const cleanSessionId = String(sessionId || "").trim();
  const cleanSignature = String(signature || "").trim();
  const expiry = Number(expiresAt);
  const now = Math.floor(Date.now() / 1000);

  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(cleanSessionId)) return false;
  if (!Number.isSafeInteger(expiry) || expiry < now || expiry > now + HANDOFF_MAX_FUTURE_SECONDS) return false;
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(cleanSignature)) return false;

  const expected = handoffSignature(cleanSessionId, expiry);
  const actualBuffer = Buffer.from(cleanSignature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
