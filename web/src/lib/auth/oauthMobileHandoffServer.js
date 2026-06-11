import { createHash } from "crypto";
import { sealData } from "iron-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MOBILE_POST_AUTH_HOME } from "@/lib/auth/oauthMobileHandoff";

const HANDOFF_TABLE = "torp_oauth_mobile_handoffs";
const HANDOFF_TTL_MS = 10 * 60 * 1000;

/** @param {string} state */
export function hashOAuthState(state) {
  return createHash("sha256").update(String(state)).digest("hex");
}

function handoffPassword() {
  return String(process.env.WORKOS_COOKIE_PASSWORD || "");
}

/** @returns {Map<string, { oauth_code: string, oauth_state: string, bridge_token?: string, redirect_to: string, expires_at: number }>} */
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

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from(HANDOFF_TABLE).upsert(row);
    if (!error) return { ok: true };
    console.error("[torp] oauth mobile pending save failed:", error.message);
  }

  memoryHandoffStore().set(key, {
    oauth_code: oauthCode,
    oauth_state: oauthState,
    bridge_token: bridgeToken,
    redirect_to: row.redirect_to,
    expires_at: expiresAt.getTime(),
  });
  return { ok: true };
}

/**
 * @param {string} stateKey
 * @returns {Promise<{ code: string, state: string, bridgeToken?: string, redirectTo: string } | null>}
 */
export async function consumeOAuthMobilePending(stateKey) {
  const key = String(stateKey || "").trim();
  if (!key) return null;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from(HANDOFF_TABLE)
      .select("oauth_code, oauth_state, bridge_token, redirect_to, expires_at")
      .eq("state_key", key)
      .maybeSingle();
    if (!error && data) {
      await admin.from(HANDOFF_TABLE).delete().eq("state_key", key);
      if (new Date(data.expires_at).getTime() < Date.now()) return null;
      return {
        code: String(data.oauth_code || ""),
        state: String(data.oauth_state || ""),
        bridgeToken: String(data.bridge_token || "") || undefined,
        redirectTo: String(data.redirect_to || MOBILE_POST_AUTH_HOME),
      };
    }
    if (error) {
      console.error("[torp] oauth mobile pending read failed:", error.message);
    }
  }

  const mem = memoryHandoffStore().get(key);
  memoryHandoffStore().delete(key);
  if (!mem || mem.expires_at < Date.now()) return null;
  return {
    code: mem.oauth_code,
    state: mem.oauth_state,
    bridgeToken: mem.bridge_token,
    redirectTo: mem.redirect_to,
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
