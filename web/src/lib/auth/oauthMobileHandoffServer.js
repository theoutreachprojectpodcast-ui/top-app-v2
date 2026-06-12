import { createHash } from "crypto";
import { sealData } from "iron-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MOBILE_POST_AUTH_HOME } from "@/lib/auth/oauthMobileHandoff";

const HANDOFF_TABLE = "torp_oauth_mobile_handoffs";
const HANDOFF_TTL_MS = 10 * 60 * 1000;
const SESSION_PLACEHOLDER = "__session__";

/** @param {string} state */
export function hashOAuthState(state) {
  return createHash("sha256").update(String(state)).digest("hex");
}

function handoffPassword() {
  return String(process.env.WORKOS_COOKIE_PASSWORD || "");
}

/** @returns {Map<string, object>} */
function memoryHandoffStore() {
  if (!globalThis.__torpOAuthHandoffs) {
    globalThis.__torpOAuthHandoffs = new Map();
  }
  return globalThis.__torpOAuthHandoffs;
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
 * @param {object} row
 */
async function upsertHandoffRow(row) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from(HANDOFF_TABLE).upsert(row);
    if (!error) return { ok: true, via: "supabase" };
    console.error("[torp] oauth mobile handoff upsert failed:", error.message, error.code || "");
    return { ok: false, error };
  }
  if (isProdLike()) {
    console.warn("[torp] oauth mobile handoff: Supabase admin unavailable");
    return { ok: false };
  }
  return { ok: false, via: "memory" };
}

/**
 * @param {string} stateKey
 * @param {string[]} setCookies
 * @param {string} [redirectTo]
 */
export async function saveOAuthMobileSessionHandoff(stateKey, setCookies, redirectTo = MOBILE_POST_AUTH_HOME) {
  const key = String(stateKey || "").trim();
  const cookies = Array.isArray(setCookies) ? setCookies.filter(Boolean) : [];
  if (!key || cookies.length === 0) {
    return { ok: false };
  }

  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  const row = {
    state_key: key,
    oauth_code: SESSION_PLACEHOLDER,
    oauth_state: SESSION_PLACEHOLDER,
    bridge_token: null,
    session_cookies: cookies,
    redirect_to: redirectTo || MOBILE_POST_AUTH_HOME,
    expires_at: expiresAt.toISOString(),
  };

  const saved = await upsertHandoffRow(row);
  if (saved.ok) return { ok: true };

  if (isProdLike()) {
    return { ok: false, reason: "handoff_storage_unavailable" };
  }

  memoryHandoffStore().set(key, {
    session_cookies: cookies,
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true };
}

/**
 * @param {string} stateKey
 * @param {string} code
 * @param {string} state
 * @param {string} [redirectTo]
 */
export async function saveOAuthMobilePending(stateKey, code, state, redirectTo = MOBILE_POST_AUTH_HOME) {
  const key = String(stateKey || "").trim();
  const oauthCode = String(code || "").trim();
  const oauthState = String(state || "").trim();
  if (!key || !oauthCode || !oauthState) {
    return { ok: false };
  }

  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
  const bridgeToken = await sealOAuthBridge(oauthCode, oauthState);
  const row = {
    state_key: key,
    oauth_code: oauthCode,
    oauth_state: oauthState,
    bridge_token: bridgeToken || null,
    redirect_to: redirectTo || MOBILE_POST_AUTH_HOME,
    expires_at: expiresAt.toISOString(),
  };

  const saved = await upsertHandoffRow(row);
  if (saved.ok) return { ok: true, bridgeToken };

  if (bridgeToken) {
    return { ok: true, bridgeToken, bridgeOnly: true };
  }

  if (isProdLike()) {
    return { ok: false, reason: "handoff_storage_unavailable" };
  }

  memoryHandoffStore().set(key, {
    oauth_code: oauthCode,
    oauth_state: oauthState,
    bridge_token: bridgeToken,
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true, bridgeToken };
}

/**
 * @param {string} stateKey
 * @param {{ consume?: boolean }} [options]
 */
async function readHandoffRow(stateKey, { consume = true } = {}) {
  const key = String(stateKey || "").trim();
  if (!key) return null;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from(HANDOFF_TABLE)
      .select("oauth_code, oauth_state, bridge_token, session_cookies, redirect_to, expires_at")
      .eq("state_key", key)
      .maybeSingle();
    if (!error && data) {
      if (consume) {
        await admin.from(HANDOFF_TABLE).delete().eq("state_key", key);
      }
      if (new Date(data.expires_at).getTime() < Date.now()) return null;
      return data;
    }
    if (error) {
      console.error("[torp] oauth mobile handoff read failed:", error.message);
    }
  }

  const mem = memoryHandoffStore().get(key);
  if (!mem || mem.expires_at < Date.now()) return null;
  if (consume) memoryHandoffStore().delete(key);
  return {
    oauth_code: mem.oauth_code,
    oauth_state: mem.oauth_state,
    bridge_token: mem.bridge_token,
    session_cookies: mem.session_cookies,
    redirect_to: mem.redirect_to,
    expires_at: new Date(mem.expires_at).toISOString(),
  };
}

/**
 * @param {string} stateKey
 * @returns {Promise<{ setCookies: string[], redirectTo: string } | null>}
 */
export async function consumeOAuthMobileSessionHandoff(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: true });
  if (!data) return null;

  const cookies = Array.isArray(data.session_cookies) ? data.session_cookies.filter(Boolean) : [];
  if (cookies.length > 0) {
    return {
      setCookies: cookies,
      redirectTo: String(data.redirect_to || MOBILE_POST_AUTH_HOME),
    };
  }
  return null;
}

/**
 * @param {string} stateKey
 * @returns {Promise<{ code: string, state: string, bridgeToken?: string, redirectTo: string } | null>}
 */
export async function consumeOAuthMobilePending(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: true });
  if (!data) return null;

  const cookies = Array.isArray(data.session_cookies) ? data.session_cookies.filter(Boolean) : [];
  if (cookies.length > 0) {
    return null;
  }

  const code = String(data.oauth_code || "").trim();
  const state = String(data.oauth_state || "").trim();
  if (!code || !state || code === SESSION_PLACEHOLDER) return null;

  return {
    code,
    state,
    bridgeToken: String(data.bridge_token || "") || undefined,
    redirectTo: String(data.redirect_to || MOBILE_POST_AUTH_HOME),
  };
}

/**
 * Peek without consuming — WebView poll until handoff is ready.
 * @param {string} stateKey
 */
export async function peekOAuthMobileHandoff(stateKey) {
  const data = await readHandoffRow(stateKey, { consume: false });
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const cookies = Array.isArray(data.session_cookies) ? data.session_cookies.filter(Boolean) : [];
  if (cookies.length > 0) {
    return {
      kind: "session",
      redirectTo: String(data.redirect_to || MOBILE_POST_AUTH_HOME),
    };
  }

  const code = String(data.oauth_code || "").trim();
  const state = String(data.oauth_state || "").trim();
  if (!code || !state || code === SESSION_PLACEHOLDER) return null;

  return {
    kind: "oauth",
    code,
    state,
    bridgeToken: String(data.bridge_token || "") || undefined,
    redirectTo: String(data.redirect_to || MOBILE_POST_AUTH_HOME),
  };
}

/**
 * @param {string} bridgeToken
 * @returns {Promise<{ code: string, state: string } | null>}
 */
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
