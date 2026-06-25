import { createHash } from "crypto";
import { sealData } from "iron-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOauthHandoffTable } from "@/lib/supabase/tableNames";
import { MOBILE_POST_AUTH_HOME, TOP_OAUTH_POLL_KEY_COOKIE } from "@/lib/auth/oauthMobileHandoff";
import { oauthStateFromAuthorizeUrl } from "@/lib/auth/workosAuthorizationRedirect";

const HANDOFF_TTL_MS = 10 * 60 * 1000;
const SESSION_PLACEHOLDER = "__session__";
const AUTHORIZE_PLACEHOLDER = "__authorize__";
const COOKIE_AUTHORIZE = "__top_authorize:";
const COOKIE_OAUTH = "__top_oauth:";

/** Production Supabase column for handoff payload cookies. */
const HANDOFF_COOKIE_COLUMN = "set_cookies";
const HANDOFF_SELECT = `${HANDOFF_COOKIE_COLUMN}, redirect_to, expires_at`;

/** @param {string} state */
export function hashOAuthState(state) {
  return createHash("sha256").update(String(state)).digest("hex");
}

/**
 * Poll key for `/api/mobile/oauth-handoff` — must match the WebView `TOP_OAUTH_STATE_KEY`.
 * The poll-key cookie from `/auth/workos-browser-start` is authoritative; URL `state` is
 * mangled by `URLSearchParams` (`+` → space) when sealed state is returned on the callback.
 *
 * @param {Request} request
 * @param {string} callbackUrl
 */
export function resolveOAuthHandoffPollKey(request, callbackUrl) {
  const fromCookie = String(request.cookies.get(TOP_OAUTH_POLL_KEY_COOKIE)?.value || "").trim();
  if (fromCookie) return fromCookie;
  const raw = oauthStateFromAuthorizeUrl(callbackUrl) || "";
  return raw ? hashOAuthState(raw) : "";
}

function handoffPassword() {
  return String(process.env.WORKOS_COOKIE_PASSWORD || "");
}

/** @returns {Map<string, object>} */
function memoryHandoffStore() {
  if (!globalThis.__topOAuthHandoffs) {
    globalThis.__topOAuthHandoffs = new Map();
  }
  return globalThis.__topOAuthHandoffs;
}

async function sealAuthorizeBundle(url, sealedState) {
  const password = handoffPassword();
  if (password.length < 32) return "";
  try {
    return await sealData({ url, sealedState }, { password, ttl: 600 });
  } catch {
    return "";
  }
}

async function unsealAuthorizeBundle(token) {
  const password = handoffPassword();
  const raw = String(token || "").trim();
  if (!raw || password.length < 32) return null;
  try {
    const { unsealData } = await import("iron-session");
    const data = await unsealData(raw, { password, ttl: 600 });
    const url = String(data?.url || "").trim();
    const sealedState = String(data?.sealedState || "").trim();
    if (!url.startsWith("https://") || !sealedState) return null;
    return { url, sealedState };
  } catch {
    return null;
  }
}

async function sealOAuthBridge(code, state) {
  const password = handoffPassword();
  if (password.length < 32) return "";
  try {
    return await sealData({ code, state }, { password, ttl: 600 });
  } catch {
    return "";
  }
}

function isProdLike() {
  return (
    String(process.env.VERCEL_ENV || "").toLowerCase() === "production" ||
    String(process.env.NODE_ENV || "").toLowerCase() === "production"
  );
}

/**
 * @param {object | null | undefined} data
 * @returns {{
 *   kind: "authorize" | "oauth" | "session",
 *   token?: string,
 *   bridgeToken?: string,
 *   code?: string,
 *   state?: string,
 *   cookies?: string[],
 *   redirectTo: string,
 * } | null}
 */
function parseHandoffPayload(data) {
  if (!data) return null;
  const redirectTo = String(data.redirect_to || MOBILE_POST_AUTH_HOME);
  const cookies = Array.isArray(data[HANDOFF_COOKIE_COLUMN]) ? data[HANDOFF_COOKIE_COLUMN].filter(Boolean) : [];
  const first = String(cookies[0] || "");

  if (first.startsWith(COOKIE_AUTHORIZE)) {
    return { kind: "authorize", token: first.slice(COOKIE_AUTHORIZE.length), redirectTo };
  }
  if (first.startsWith(COOKIE_OAUTH)) {
    return { kind: "oauth", bridgeToken: first.slice(COOKIE_OAUTH.length), redirectTo };
  }
  if (cookies.length > 0) {
    return { kind: "session", cookies, redirectTo };
  }

  const code = String(data.oauth_code || "").trim();
  const state = String(data.oauth_state || "").trim();
  if (code === AUTHORIZE_PLACEHOLDER) {
    return { kind: "authorize", token: state || String(data.bridge_token || ""), redirectTo };
  }
  if (code && state && code !== SESSION_PLACEHOLDER && code !== AUTHORIZE_PLACEHOLDER) {
    return {
      kind: "oauth",
      code,
      state,
      bridgeToken: String(data.bridge_token || "") || undefined,
      redirectTo,
    };
  }
  return null;
}

/**
 * @param {object} row
 */
async function upsertHandoffRow(row) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const table = await resolveOauthHandoffTable(admin);
    const { error } = await admin.from(table).upsert(row, { onConflict: "state_key" });
    if (!error) return { ok: true, via: "supabase" };
    console.error("[top] oauth mobile handoff upsert failed:", error.message, error.code || "", error.details || "");
    return { ok: false, error, reason: error.message };
  }
  if (isProdLike()) {
    console.warn("[top] oauth mobile handoff: Supabase admin unavailable");
    return { ok: false, reason: "supabase_admin_unavailable" };
  }
  return { ok: false, via: "memory" };
}

async function deleteHandoffRow(stateKey) {
  const key = String(stateKey || "").trim();
  if (!key) return;
  const admin = createSupabaseAdminClient();
  if (admin) {
    const table = await resolveOauthHandoffTable(admin);
    await admin.from(table).delete().eq("state_key", key);
    return;
  }
  memoryHandoffStore().delete(key);
}

/**
 * Store WorkOS authorize URL + sealed state for Capacitor Browser.open (short `?key=` URL).
 */
export async function saveOAuthAuthorizePending(stateKey, url, sealedState, redirectTo = MOBILE_POST_AUTH_HOME) {
  const key = String(stateKey || "").trim();
  const authorizeUrl = String(url || "").trim();
  const state = String(sealedState || "").trim();
  if (!key || !authorizeUrl.startsWith("https://") || !state) {
    return { ok: false };
  }

  const token = await sealAuthorizeBundle(authorizeUrl, state);
  if (!token) return { ok: false, reason: "seal_failed" };

  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  const row = {
    state_key: key,
    [HANDOFF_COOKIE_COLUMN]: [`${COOKIE_AUTHORIZE}${token}`],
    redirect_to: redirectTo || MOBILE_POST_AUTH_HOME,
    expires_at: expiresAt.toISOString(),
  };

  const saved = await upsertHandoffRow(row);
  if (saved.ok) return { ok: true };

  if (isProdLike()) {
    console.error("[top] oauth authorize pending save failed:", saved.reason || saved.error?.message || "unknown");
    return { ok: false, reason: saved.reason || "handoff_storage_unavailable" };
  }

  memoryHandoffStore().set(key, {
    [HANDOFF_COOKIE_COLUMN]: row[HANDOFF_COOKIE_COLUMN],
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true };
}

export async function peekOAuthAuthorizePending(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: false });
  const payload = parseHandoffPayload(data);
  if (payload?.kind !== "authorize") return null;
  return unsealAuthorizeBundle(payload.token);
}

export async function consumeOAuthAuthorizePending(stateKey) {
  const pending = await peekOAuthAuthorizePending(stateKey);
  if (!pending) return null;
  await deleteHandoffRow(stateKey);
  return pending;
}

export async function saveOAuthMobileSessionHandoff(stateKey, setCookies, redirectTo = MOBILE_POST_AUTH_HOME) {
  const key = String(stateKey || "").trim();
  const cookies = Array.isArray(setCookies) ? setCookies.filter(Boolean) : [];
  if (!key || cookies.length === 0) {
    return { ok: false };
  }

  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  const row = {
    state_key: key,
    [HANDOFF_COOKIE_COLUMN]: cookies,
    redirect_to: redirectTo || MOBILE_POST_AUTH_HOME,
    expires_at: expiresAt.toISOString(),
  };

  const saved = await upsertHandoffRow(row);
  if (saved.ok) return { ok: true };

  if (isProdLike()) {
    return { ok: false, reason: "handoff_storage_unavailable" };
  }

  memoryHandoffStore().set(key, {
    [HANDOFF_COOKIE_COLUMN]: cookies,
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true };
}

export async function saveOAuthMobilePending(stateKey, code, state, redirectTo = MOBILE_POST_AUTH_HOME) {
  const key = String(stateKey || "").trim();
  const oauthCode = String(code || "").trim();
  const oauthState = String(state || "").trim();
  if (!key || !oauthCode || !oauthState) {
    return { ok: false };
  }

  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  const bridgeToken = await sealOAuthBridge(oauthCode, oauthState);
  if (!bridgeToken) {
    return { ok: false, reason: "seal_failed" };
  }

  const row = {
    state_key: key,
    [HANDOFF_COOKIE_COLUMN]: [`${COOKIE_OAUTH}${bridgeToken}`],
    redirect_to: redirectTo || MOBILE_POST_AUTH_HOME,
    expires_at: expiresAt.toISOString(),
  };

  const saved = await upsertHandoffRow(row);
  if (saved.ok) return { ok: true, bridgeToken };

  if (isProdLike()) {
    return { ok: false, reason: "handoff_storage_unavailable" };
  }

  memoryHandoffStore().set(key, {
    [HANDOFF_COOKIE_COLUMN]: row[HANDOFF_COOKIE_COLUMN],
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true, bridgeToken };
}

async function readHandoffRow(stateKey, { consume = true } = {}) {
  const key = String(stateKey || "").trim();
  if (!key) return null;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const table = await resolveOauthHandoffTable(admin);
    const { data, error } = await admin
      .from(table)
      .select(HANDOFF_SELECT)
      .eq("state_key", key)
      .maybeSingle();
    if (!error && data) {
      if (consume) {
        await admin.from(table).delete().eq("state_key", key);
      }
      if (new Date(data.expires_at).getTime() < Date.now()) return null;
      return data;
    }
    if (error) {
      console.error("[top] oauth mobile handoff read failed:", error.message);
    }
  }

  const mem = memoryHandoffStore().get(key);
  if (!mem || mem.expires_at < Date.now()) return null;
  if (consume) memoryHandoffStore().delete(key);
  return {
    [HANDOFF_COOKIE_COLUMN]: mem[HANDOFF_COOKIE_COLUMN],
    redirect_to: mem.redirect_to,
    expires_at: new Date(mem.expires_at).toISOString(),
  };
}

export async function consumeOAuthMobileSessionHandoff(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: true });
  const payload = parseHandoffPayload(data);
  if (payload?.kind !== "session" || !payload.cookies?.length) return null;
  return {
    setCookies: payload.cookies,
    redirectTo: payload.redirectTo,
  };
}

export async function consumeOAuthMobilePending(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: true });
  const payload = parseHandoffPayload(data);
  if (payload?.kind !== "oauth") return null;

  if (payload.bridgeToken) {
    const unsealed = await unsealOAuthBridge(payload.bridgeToken);
    if (!unsealed) return null;
    return {
      code: unsealed.code,
      state: unsealed.state,
      bridgeToken: payload.bridgeToken,
      redirectTo: payload.redirectTo,
    };
  }

  if (!payload.code || !payload.state) return null;
  return {
    code: payload.code,
    state: payload.state,
    bridgeToken: payload.bridgeToken,
    redirectTo: payload.redirectTo,
  };
}

export async function peekOAuthMobileHandoff(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: false });
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const payload = parseHandoffPayload(data);
  if (!payload) return null;

  if (payload.kind === "authorize") return null;

  if (payload.kind === "session") {
    return {
      kind: "session",
      redirectTo: payload.redirectTo,
    };
  }

  if (payload.bridgeToken) {
    const unsealed = await unsealOAuthBridge(payload.bridgeToken);
    if (!unsealed) return null;
    return {
      kind: "oauth",
      code: unsealed.code,
      state: unsealed.state,
      bridgeToken: payload.bridgeToken,
      redirectTo: payload.redirectTo,
    };
  }

  if (!payload.code || !payload.state) return null;
  return {
    kind: "oauth",
    code: payload.code,
    state: payload.state,
    bridgeToken: payload.bridgeToken,
    redirectTo: payload.redirectTo,
  };
}

export async function unsealOAuthBridge(bridgeToken) {
  const password = handoffPassword();
  const token = String(bridgeToken || "").trim();
  if (!token || password.length < 32) return null;
  try {
    const { unsealData } = await import("iron-session");
    const data = await unsealData(token, { password, ttl: 600 });
    const code = String(data?.code || "").trim();
    const state = String(data?.state || "").trim();
    if (!code || !state) return null;
    return { code, state };
  } catch {
    return null;
  }
}
