/**
 * Atomic bulk license redemption → membership_source=bulk_org Pro entitlement.
 */
import { hashLicenseToken } from "@/lib/bulkLicensing/licenseCodes";
import { evaluateBulkRedemptionEligibility } from "@/lib/bulkLicensing/membershipRules";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";
import { profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   redeemToken: string,
 *   workosUserId: string,
 *   email: string,
 * }} opts
 */
export async function redeemBulkLicense(admin, opts) {
  const token = String(opts.redeemToken || "").trim().toUpperCase();
  const workosUserId = String(opts.workosUserId || "").trim();
  const email = String(opts.email || "").trim().toLowerCase();
  if (!token || !workosUserId) {
    return { ok: false, error: "invalid_request", message: "License code and sign-in are required." };
  }

  const tokenHash = hashLicenseToken(token);
  const { data: license, error: licErr } = await admin
    .from("bulk_individual_licenses")
    .select("*")
    .eq("secure_token_hash", tokenHash)
    .maybeSingle();

  if (licErr) throw licErr;
  if (!license) {
    return { ok: false, error: "license_not_found", message: "That license code is not valid." };
  }

  if (license.status === "redeemed") {
    if (license.redeemed_by_user_id === workosUserId) {
      return { ok: true, alreadyRedeemed: true, licenseId: license.id, organizationId: license.organization_id };
    }
    return { ok: false, error: "already_redeemed", message: "This license has already been redeemed." };
  }
  if (license.status === "revoked") {
    return { ok: false, error: "revoked", message: "This license has been revoked." };
  }
  if (license.status === "expired" || license.status === "suspended") {
    return { ok: false, error: "inactive", message: "This license is not currently active." };
  }
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired", message: "This license has expired." };
  }

  const { data: org } = await admin
    .from("bulk_organizations")
    .select("id, name, business_code, status")
    .eq("id", license.organization_id)
    .maybeSingle();

  if (!org || org.status !== "active") {
    return {
      ok: false,
      error: "organization_inactive",
      message: "The organization for this license is not active.",
    };
  }

  const { data: sub } = await admin
    .from("bulk_subscriptions")
    .select("id, subscription_status, current_period_end")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subStatus = String(sub?.subscription_status || "").toLowerCase();
  if (sub && !["active", "trialing"].includes(subStatus) && subStatus !== "past_due") {
    // past_due may still allow during grace; unpaid/canceled block
    if (["canceled", "incomplete", "unpaid"].includes(subStatus)) {
      return {
        ok: false,
        error: "subscription_invalid",
        message: "The organization subscription is not valid for redemption.",
      };
    }
  }

  if (license.assigned_email) {
    const assigned = String(license.assigned_email).trim().toLowerCase();
    if (assigned && email && assigned !== email) {
      return {
        ok: false,
        error: "email_mismatch",
        message: "This license was assigned to a different email address.",
      };
    }
  }

  const profile = await getProfileRowByWorkOSId(admin, workosUserId);
  const eligibility = evaluateBulkRedemptionEligibility(profile, org.id);
  if (!eligibility.ok) {
    return {
      ok: false,
      error: eligibility.error,
      message: eligibility.message,
      warnings: eligibility.warnings,
    };
  }

  const now = new Date().toISOString();
  const expiresAt = license.expires_at || sub?.current_period_end || null;

  // Conditional update prevents concurrent double-redeem
  const { data: updated, error: updateErr } = await admin
    .from("bulk_individual_licenses")
    .update({
      status: "redeemed",
      redeemed_by_user_id: workosUserId,
      redeemed_at: now,
      assigned_email: license.assigned_email || email || null,
      invitation_token_hash: null,
      invitation_expires_at: null,
      updated_at: now,
    })
    .eq("id", license.id)
    .in("status", ["available", "assigned"])
    .is("redeemed_by_user_id", null)
    .select("id")
    .maybeSingle();

  if (updateErr) throw updateErr;
  if (!updated) {
    return {
      ok: false,
      error: "redeem_race",
      message: "This license was just redeemed by someone else. Try a different code.",
    };
  }

  const table = profileTableName();
  await admin
    .from(table)
    .update({
      membership_tier: "member",
      membership_status: "active",
      billing_status: "active",
      membership_source: "bulk_org",
      renewal_date: expiresAt,
      bulk_organization_id: org.id,
      bulk_license_id: license.id,
      updated_at: now,
    })
    .eq("workos_user_id", workosUserId);

  const { data: batch } = await admin
    .from("bulk_license_batches")
    .select("id, redeemed_count")
    .eq("id", license.license_batch_id)
    .maybeSingle();

  if (batch) {
    await admin
      .from("bulk_license_batches")
      .update({
        redeemed_count: Number(batch.redeemed_count || 0) + 1,
        updated_at: now,
      })
      .eq("id", batch.id);
  }

  await recordBulkLicenseEvent(admin, {
    organizationId: org.id,
    licenseId: license.id,
    eventType: "license_redeemed",
    actorUserId: workosUserId,
    actorType: "user",
    metadata: {
      seatNumber: license.seat_number,
      displayCodeMasked: String(license.display_code || "").replace(/-[^-]+$/, "-••••••"),
    },
  });

  return {
    ok: true,
    licenseId: license.id,
    organizationId: org.id,
    organizationName: org.name,
    businessCode: org.business_code,
    expiresAt,
    warnings: eligibility.warnings || [],
  };
}

/**
 * Redeem via invitation link (authenticated), without exposing the seat display code.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ inviteToken: string, workosUserId: string, email: string }} opts
 */
export async function redeemBulkLicenseByInvitation(admin, opts) {
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(String(opts.inviteToken || "").trim(), "utf8").digest("hex");
  const { data: license } = await admin
    .from("bulk_individual_licenses")
    .select("display_code, status, invitation_expires_at")
    .eq("invitation_token_hash", hash)
    .maybeSingle();

  if (!license) {
    return { ok: false, error: "invite_not_found", message: "This invitation link is invalid." };
  }
  if (license.invitation_expires_at && new Date(license.invitation_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "invite_expired", message: "This invitation link has expired." };
  }
  if (license.status !== "assigned" && license.status !== "available") {
    return { ok: false, error: "invite_inactive", message: "This invitation is no longer valid." };
  }

  return redeemBulkLicense(admin, {
    redeemToken: license.display_code,
    workosUserId: opts.workosUserId,
    email: opts.email,
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   licenseId: string,
 *   actorUserId: string,
 *   actorType?: 'user' | 'admin',
 *   reason?: string,
 * }} opts
 */
export async function revokeBulkLicense(admin, opts) {
  const { data: license } = await admin
    .from("bulk_individual_licenses")
    .select("*")
    .eq("id", opts.licenseId)
    .maybeSingle();
  if (!license) return { ok: false, error: "not_found" };

  const now = new Date().toISOString();
  const wasRedeemed = license.status === "redeemed" && license.redeemed_by_user_id;

  await admin
    .from("bulk_individual_licenses")
    .update({
      status: "revoked",
      revoked_at: now,
      revoked_by: opts.actorUserId,
      revocation_reason: opts.reason || null,
      invitation_token_hash: null,
      invitation_expires_at: null,
      updated_at: now,
    })
    .eq("id", license.id);

  if (wasRedeemed) {
    const table = profileTableName();
    const { data: profile } = await admin
      .from(table)
      .select("workos_user_id, stripe_subscription_id, membership_source")
      .eq("workos_user_id", license.redeemed_by_user_id)
      .maybeSingle();

    if (profile && String(profile.membership_source || "") === "bulk_org") {
      const hasPersonalSub = !!String(profile.stripe_subscription_id || "").trim();
      await admin
        .from(table)
        .update({
          bulk_organization_id: null,
          bulk_license_id: null,
          membership_source: hasPersonalSub ? "stripe" : "manual",
          membership_tier: hasPersonalSub ? "member" : "free",
          membership_status: hasPersonalSub ? "active" : "canceled",
          billing_status: hasPersonalSub ? "active" : "canceled",
          updated_at: now,
        })
        .eq("workos_user_id", license.redeemed_by_user_id)
        .eq("bulk_license_id", license.id);
    }
  }

  await recordBulkLicenseEvent(admin, {
    organizationId: license.organization_id,
    licenseId: license.id,
    eventType: "license_revoked",
    actorUserId: opts.actorUserId,
    actorType: opts.actorType || "user",
    metadata: { reason: opts.reason || null },
  });

  return { ok: true };
}
