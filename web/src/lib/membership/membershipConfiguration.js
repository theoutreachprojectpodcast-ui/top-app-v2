/**
 * Central membership plan configuration (Support feature flag + Pro availability).
 * Source of truth: `membership_plan_configuration` (service role). Defaults Support OFF.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supportSubscriptionPriceId, proSubscriptionPriceId } from "@/lib/billing/stripeConfig";
import {
  PRO_MEMBERSHIP_ANNUAL_CENTS,
  SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
} from "@/lib/billing/membershipPricing";

export const MEMBERSHIP_CONFIG_TABLE = "membership_plan_configuration";
export const MEMBERSHIP_CONFIG_AUDIT_TABLE = "membership_configuration_audit_log";
export const MEMBERSHIP_CONFIG_ROW_ID = "default";
export const MEMBERSHIP_CONFIG_ADMIN_SETTING_KEY = "membership.plan_availability";

/** @typedef {{
 *   supportMembershipEnabled: boolean,
 *   proMembershipEnabled: boolean,
 *   supportStripePriceId: string,
 *   proStripePriceId: string,
 *   supportDisplayName: string,
 *   proDisplayName: string,
 *   supportPriceLabel: string,
 *   proPriceLabel: string,
 *   supportAnnualCents: number,
 *   proAnnualCents: number,
 *   updatedAt: string | null,
 *   updatedBy: string | null,
 *   source: 'database' | 'default' | 'admin_settings',
 * }} MembershipConfiguration */

const DEFAULT_CONFIG = Object.freeze({
  supportMembershipEnabled: false,
  proMembershipEnabled: true,
  supportStripePriceId: "",
  proStripePriceId: "",
  supportDisplayName: "Support Membership",
  proDisplayName: "Pro Membership",
  supportPriceLabel: "$0.99/yr",
  proPriceLabel: "$5.99/yr",
  supportAnnualCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
  proAnnualCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
  updatedAt: null,
  updatedBy: null,
  source: "default",
});

/** @type {{ value: MembershipConfiguration, expiresAt: number } | null} */
let memoryCache = null;
const CACHE_TTL_MS = 15_000;

function centsToLabel(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return `$${(n / 100).toFixed(2).replace(/\.00$/, "")}/yr`;
}

/** @returns {MembershipConfiguration} */
export function defaultMembershipConfiguration() {
  return {
    ...DEFAULT_CONFIG,
    supportStripePriceId: supportSubscriptionPriceId() || "",
    proStripePriceId: proSubscriptionPriceId() || "",
    supportPriceLabel: centsToLabel(SUPPORT_MEMBERSHIP_ANNUAL_CENTS) || DEFAULT_CONFIG.supportPriceLabel,
    proPriceLabel: centsToLabel(PRO_MEMBERSHIP_ANNUAL_CENTS) || DEFAULT_CONFIG.proPriceLabel,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {'database' | 'admin_settings' | 'default'} [source]
 * @returns {MembershipConfiguration}
 */
export function normalizeMembershipConfiguration(row, source = "database") {
  const base = defaultMembershipConfiguration();
  if (!row || typeof row !== "object") return { ...base, source: "default" };

  const supportEnabled =
    row.support_membership_enabled != null
      ? !!row.support_membership_enabled
      : row.supportMembershipEnabled != null
        ? !!row.supportMembershipEnabled
        : false;

  const proEnabled =
    row.pro_membership_enabled != null
      ? !!row.pro_membership_enabled
      : row.proMembershipEnabled != null
        ? !!row.proMembershipEnabled
        : true;

  return {
    supportMembershipEnabled: supportEnabled,
    proMembershipEnabled: proEnabled,
    supportStripePriceId:
      String(row.support_stripe_price_id || row.supportStripePriceId || base.supportStripePriceId || "").trim(),
    proStripePriceId:
      String(row.pro_stripe_price_id || row.proStripePriceId || base.proStripePriceId || "").trim(),
    supportDisplayName:
      String(row.support_display_name || row.supportDisplayName || base.supportDisplayName).trim() ||
      base.supportDisplayName,
    proDisplayName:
      String(row.pro_display_name || row.proDisplayName || base.proDisplayName).trim() || base.proDisplayName,
    supportPriceLabel:
      String(row.support_price_label || row.supportPriceLabel || base.supportPriceLabel).trim() ||
      base.supportPriceLabel,
    proPriceLabel:
      String(row.pro_price_label || row.proPriceLabel || base.proPriceLabel).trim() || base.proPriceLabel,
    supportAnnualCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
    proAnnualCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
    updatedAt: row.updated_at || row.updatedAt || null,
    updatedBy: row.updated_by || row.updatedBy || null,
    source,
  };
}

export function clearMembershipConfigurationCache() {
  memoryCache = null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} [admin]
 * @param {{ bypassCache?: boolean }} [opts]
 * @returns {Promise<MembershipConfiguration>}
 */
export async function getMembershipConfiguration(admin, opts = {}) {
  const now = Date.now();
  if (!opts.bypassCache && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.value;
  }

  const client = admin || createSupabaseAdminClient();
  if (!client) {
    const fallback = defaultMembershipConfiguration();
    memoryCache = { value: fallback, expiresAt: now + CACHE_TTL_MS };
    return fallback;
  }

  try {
    const { data, error } = await client
      .from(MEMBERSHIP_CONFIG_TABLE)
      .select("*")
      .eq("id", MEMBERSHIP_CONFIG_ROW_ID)
      .maybeSingle();

    if (!error && data) {
      const cfg = normalizeMembershipConfiguration(data, "database");
      // Env price IDs win when DB columns are empty (deploy-time Stripe config).
      if (!cfg.supportStripePriceId) cfg.supportStripePriceId = supportSubscriptionPriceId() || "";
      if (!cfg.proStripePriceId) cfg.proStripePriceId = proSubscriptionPriceId() || "";
      memoryCache = { value: cfg, expiresAt: now + CACHE_TTL_MS };
      return cfg;
    }
  } catch {
    /* table may not exist yet — fall through */
  }

  // Fallback: admin_settings mirror
  try {
    const { data, error } = await client
      .from("admin_settings")
      .select("setting_value, updated_at, updated_by")
      .eq("setting_key", MEMBERSHIP_CONFIG_ADMIN_SETTING_KEY)
      .maybeSingle();
    if (!error && data?.setting_value && typeof data.setting_value === "object") {
      const cfg = normalizeMembershipConfiguration(
        {
          ...data.setting_value,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
        },
        "admin_settings",
      );
      memoryCache = { value: cfg, expiresAt: now + CACHE_TTL_MS };
      return cfg;
    }
  } catch {
    /* ignore */
  }

  const fallback = defaultMembershipConfiguration();
  memoryCache = { value: fallback, expiresAt: now + CACHE_TTL_MS };
  return fallback;
}

/** @returns {Promise<boolean>} */
export async function isSupportMembershipEnabled(admin) {
  const cfg = await getMembershipConfiguration(admin);
  return cfg.supportMembershipEnabled === true;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   supportMembershipEnabled?: boolean,
 *   proMembershipEnabled?: boolean,
 *   reason?: string,
 *   actorWorkosUserId?: string,
 *   actorEmail?: string,
 *   environment?: string,
 *   requestMeta?: Record<string, unknown>,
 * }} patch
 */
export async function updateMembershipConfiguration(admin, patch) {
  if (!admin) throw new Error("admin_client_required");

  const previous = await getMembershipConfiguration(admin, { bypassCache: true });
  const next = {
    support_membership_enabled:
      patch.supportMembershipEnabled != null
        ? !!patch.supportMembershipEnabled
        : previous.supportMembershipEnabled,
    pro_membership_enabled:
      patch.proMembershipEnabled != null ? !!patch.proMembershipEnabled : previous.proMembershipEnabled,
    support_stripe_price_id: previous.supportStripePriceId || supportSubscriptionPriceId() || null,
    pro_stripe_price_id: previous.proStripePriceId || proSubscriptionPriceId() || null,
    support_display_name: previous.supportDisplayName,
    pro_display_name: previous.proDisplayName,
    support_price_label: previous.supportPriceLabel,
    pro_price_label: previous.proPriceLabel,
    updated_at: new Date().toISOString(),
    updated_by: String(patch.actorEmail || patch.actorWorkosUserId || "").trim() || null,
  };

  const { data, error } = await admin
    .from(MEMBERSHIP_CONFIG_TABLE)
    .upsert({ id: MEMBERSHIP_CONFIG_ROW_ID, ...next }, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    // Table missing — mirror to admin_settings so toggle still works pre-migration.
    await admin.from("admin_settings").upsert(
      {
        setting_key: MEMBERSHIP_CONFIG_ADMIN_SETTING_KEY,
        setting_value: {
          supportMembershipEnabled: next.support_membership_enabled,
          proMembershipEnabled: next.pro_membership_enabled,
          updatedAt: next.updated_at,
          updatedBy: next.updated_by,
        },
        updated_by: next.updated_by,
        updated_at: next.updated_at,
      },
      { onConflict: "setting_key" },
    );
  } else {
    await admin.from("admin_settings").upsert(
      {
        setting_key: MEMBERSHIP_CONFIG_ADMIN_SETTING_KEY,
        setting_value: {
          supportMembershipEnabled: next.support_membership_enabled,
          proMembershipEnabled: next.pro_membership_enabled,
          updatedAt: next.updated_at,
          updatedBy: next.updated_by,
        },
        updated_by: next.updated_by,
        updated_at: next.updated_at,
      },
      { onConflict: "setting_key" },
    );
  }

  const action = next.support_membership_enabled
    ? previous.supportMembershipEnabled
      ? "SUPPORT_MEMBERSHIP_UPDATED"
      : "SUPPORT_MEMBERSHIP_ENABLED"
    : previous.supportMembershipEnabled
      ? "SUPPORT_MEMBERSHIP_DISABLED"
      : "SUPPORT_MEMBERSHIP_CONFIRMED_DISABLED";

  try {
    await admin.from(MEMBERSHIP_CONFIG_AUDIT_TABLE).insert({
      action,
      previous_value: previous,
      new_value: normalizeMembershipConfiguration(data || next, data ? "database" : "admin_settings"),
      actor_workos_user_id: patch.actorWorkosUserId || null,
      actor_email: patch.actorEmail || null,
      environment: patch.environment || process.env.VERCEL_ENV || process.env.NODE_ENV || null,
      reason: patch.reason || null,
      request_meta: patch.requestMeta || {},
    });
  } catch {
    /* audit table may not exist yet */
  }

  clearMembershipConfigurationCache();
  return getMembershipConfiguration(admin, { bypassCache: true });
}

/**
 * Plans exposed to checkout / pricing APIs when Support is disabled.
 * @param {MembershipConfiguration} cfg
 */
export function listPurchasableMembershipPlans(cfg) {
  const plans = [];
  if (cfg?.supportMembershipEnabled) {
    plans.push({
      tier: "support",
      checkoutTier: "support",
      label: cfg.supportDisplayName,
      priceLabel: cfg.supportPriceLabel,
      annualCents: cfg.supportAnnualCents,
      purchasable: true,
    });
  }
  if (cfg?.proMembershipEnabled !== false) {
    plans.push({
      tier: "member",
      checkoutTier: "member",
      label: cfg.proDisplayName,
      priceLabel: cfg.proPriceLabel,
      annualCents: cfg.proAnnualCents,
      purchasable: true,
    });
  }
  return plans;
}
