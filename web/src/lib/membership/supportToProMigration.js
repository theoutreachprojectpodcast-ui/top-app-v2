/**
 * Support → Pro complimentary migration service (dry-run + execute).
 * Idempotent. Never creates paid Pro Stripe subscriptions or charges.
 */
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { supportSubscriptionPriceId } from "@/lib/billing/stripeConfig";
import { sendResendNotificationEmail } from "@/server/email/sendResendNotificationEmail";
import { resolvePlatformRoleAfterTierChange } from "@/lib/account/accountModel";
import {
  SUPPORT_TO_PRO_MIGRATION_VERSION,
  SUPPORT_TO_PRO_EMAIL_TEMPLATE_VERSION,
  SUPPORT_TO_PRO_MEMBERSHIP_SOURCE,
  SUPPORT_MEMBERSHIP_STATUS_MIGRATED,
  MIGRATION_STATUS,
  resolveOriginalSupportPeriod,
  isPeriodStillActive,
  migrationEmailIdempotencyKey,
  formatMigrationExpirationDate,
  buildSupportToProMigrationEmailHtml,
  SUPPORT_TO_PRO_EMAIL_SUBJECT,
  toDate,
} from "@/lib/membership/supportToProMigrationShared";

export const MIGRATION_RECORDS_TABLE = "support_to_pro_migration_records";
export const MIGRATION_EMAILS_TABLE = "support_to_pro_migration_emails";

function supportPriceIds() {
  const ids = new Set();
  const primary = supportSubscriptionPriceId();
  if (primary) ids.add(primary);
  for (const key of [
    "STRIPE_PRICE_SUPPORT_YEARLY",
    "STRIPE_PRICE_SUPPORT_ANNUAL",
    "STRIPE_PRICE_SUPPORT_MONTHLY",
    "STRIPE_PRICE_ACCESS_YEARLY",
  ]) {
    const v = String(process.env[key] || "").trim();
    if (v) ids.add(v);
  }
  return ids;
}

function isSupportSubscription(sub, priceIds) {
  if (!sub) return false;
  const meta = String(sub.metadata?.membership_tier || "").toLowerCase();
  if (meta === "support" || meta === "access") return true;
  const items = sub.items?.data || [];
  for (const item of items) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (priceId && priceIds.has(priceId)) return true;
    const amount = item.price?.unit_amount;
    const interval = item.price?.recurring?.interval;
    if (amount === 99 && interval === "year") return true;
  }
  return false;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
export async function listSupportCandidateProfiles(admin) {
  const table = profileTableName();
  const { data, error } = await admin
    .from(table)
    .select(
      "workos_user_id, email, display_name, first_name, last_name, membership_tier, membership_status, billing_status, membership_source, stripe_customer_id, stripe_subscription_id, renewal_date, created_at, updated_at, migrated_to_pro_at, migrated_to_pro_until, migration_version, support_membership_status",
    )
    .or(
      "membership_tier.in.(support,access),support_membership_status.eq.migrated_to_pro,membership_source.eq.support_to_pro_migration",
    );

  if (error) throw new Error(error.message || "failed_to_list_support_profiles");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {import('stripe').Stripe | null} stripe
 * @param {Record<string, unknown>} profile
 * @param {Set<string>} priceIds
 */
async function loadStripeContext(stripe, profile, priceIds) {
  const out = {
    subscription: null,
    stripeStatus: null,
    cancelAtPeriodEnd: null,
    periodStart: null,
    periodEnd: null,
    firstInvoicePaidAt: null,
    checkoutCompletedAt: null,
    isSupportPrice: false,
    conflict: null,
  };
  if (!stripe) return out;

  const subId = String(profile.stripe_subscription_id || "").trim();
  const custId = String(profile.stripe_customer_id || "").trim();

  try {
    let sub = null;
    if (subId) {
      sub = await stripe.subscriptions.retrieve(subId);
    } else if (custId) {
      const list = await stripe.subscriptions.list({
        customer: custId,
        status: "all",
        limit: 20,
      });
      const supportSubs = (list.data || []).filter((s) => isSupportSubscription(s, priceIds));
      sub =
        supportSubs.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due") ||
        supportSubs[0] ||
        null;
    }

    if (sub) {
      out.subscription = sub;
      out.stripeStatus = sub.status;
      out.cancelAtPeriodEnd = !!sub.cancel_at_period_end;
      out.periodStart = sub.current_period_start || null;
      out.periodEnd = sub.current_period_end || null;
      out.isSupportPrice = isSupportSubscription(sub, priceIds);

      if (custId && sub.customer && String(sub.customer) !== custId && typeof sub.customer === "string") {
        out.conflict = "stripe_customer_mismatch";
      }

      try {
        const invoices = await stripe.invoices.list({
          customer: custId || (typeof sub.customer === "string" ? sub.customer : undefined),
          subscription: sub.id,
          status: "paid",
          limit: 5,
        });
        const paid = (invoices.data || []).filter((inv) => inv.status_transitions?.paid_at);
        paid.sort((a, b) => (a.status_transitions.paid_at || 0) - (b.status_transitions.paid_at || 0));
        if (paid[0]?.status_transitions?.paid_at) {
          out.firstInvoicePaidAt = paid[0].status_transitions.paid_at;
        }
      } catch {
        /* optional */
      }
    }
  } catch (err) {
    out.conflict = `stripe_lookup_failed:${err instanceof Error ? err.message : "unknown"}`;
  }

  return out;
}

/**
 * Classify one Support-related profile for migration.
 * @param {Record<string, unknown>} profile
 * @param {{ stripe?: import('stripe').Stripe | null, now?: Date }} [opts]
 */
export async function classifySupportMigrationCandidate(profile, opts = {}) {
  const now = opts.now || new Date();
  const priceIds = supportPriceIds();
  const stripeCtx = await loadStripeContext(opts.stripe || null, profile, priceIds);

  const tier = String(profile.membership_tier || "").toLowerCase();
  const source = String(profile.membership_source || "").toLowerCase();
  const status = String(profile.billing_status || profile.membership_status || "").toLowerCase();

  const alreadyMigrated =
    source === SUPPORT_TO_PRO_MEMBERSHIP_SOURCE ||
    String(profile.support_membership_status || "") === SUPPORT_MEMBERSHIP_STATUS_MIGRATED ||
    !!profile.migrated_to_pro_at;

  if (alreadyMigrated && isPeriodStillActive(profile.migrated_to_pro_until || profile.renewal_date, now)) {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.MIGRATED,
      eligibility: "already_migrated",
      eligible: false,
      exceptionReason: null,
      originalSupportPeriodStart: null,
      originalSupportPeriodEnd: profile.migrated_to_pro_until || profile.renewal_date || null,
      periodStartSource: "existing_migration",
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: stripeCtx.subscription?.id || profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: { alreadyMigrated: true },
    };
  }

  if (tier === "member" && source !== SUPPORT_TO_PRO_MEMBERSHIP_SOURCE && (status === "active" || status === "trialing")) {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.SKIPPED_PAID_PRO,
      eligibility: "already_paid_pro",
      eligible: false,
      exceptionReason: null,
      originalSupportPeriodStart: null,
      originalSupportPeriodEnd: null,
      periodStartSource: null,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: { note: "Active paid Pro preserved" },
    };
  }

  if (tier !== "support" && tier !== "access") {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.EXCEPTION,
      eligibility: "not_support_tier",
      eligible: false,
      exceptionReason: `membership_tier=${tier}`,
      originalSupportPeriodStart: null,
      originalSupportPeriodEnd: null,
      periodStartSource: null,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: {},
    };
  }

  if (stripeCtx.conflict?.startsWith("stripe_lookup_failed") && profile.stripe_subscription_id) {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.EXCEPTION,
      eligibility: "stripe_conflict",
      eligible: false,
      exceptionReason: stripeCtx.conflict,
      originalSupportPeriodStart: null,
      originalSupportPeriodEnd: null,
      periodStartSource: null,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: { stripeCtx },
    };
  }

  const period = resolveOriginalSupportPeriod({
    stripePeriodStart: stripeCtx.periodStart,
    stripePeriodEnd: stripeCtx.periodEnd,
    checkoutCompletedAt: stripeCtx.checkoutCompletedAt,
    firstInvoicePaidAt: stripeCtx.firstInvoicePaidAt,
    membershipActivatedAt: null,
    supportSignupAt: null,
    accountCreatedAt: profile.created_at,
    profileRenewalDate: profile.renewal_date,
  });

  if (!period.start || !period.end) {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.EXCEPTION,
      eligibility: "missing_membership_dates",
      eligible: false,
      exceptionReason: "No reliable Support period start/end date",
      originalSupportPeriodStart: null,
      originalSupportPeriodEnd: null,
      periodStartSource: null,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: stripeCtx.subscription?.id || profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: { period },
    };
  }

  if (!isPeriodStillActive(period.end, now)) {
    return {
      workosUserId: profile.workos_user_id,
      email: profile.email || "",
      displayName: profile.display_name || "",
      firstName: profile.first_name || "",
      status: MIGRATION_STATUS.SKIPPED_EXPIRED,
      eligibility: "expired",
      eligible: false,
      exceptionReason: null,
      originalSupportPeriodStart: period.start.toISOString(),
      originalSupportPeriodEnd: period.end.toISOString(),
      periodStartSource: period.startSource,
      stripeCustomerId: profile.stripe_customer_id || null,
      stripeSubscriptionId: stripeCtx.subscription?.id || profile.stripe_subscription_id || null,
      stripeStatus: stripeCtx.stripeStatus,
      stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
      previousMembershipTier: tier,
      previousMembershipStatus: status,
      previousMembershipSource: source,
      proposedStripeCancelAtPeriodEnd: false,
      audit: { periodEndSource: period.endSource },
    };
  }

  // Past-due: only migrate if Stripe still shows a paid-through period end in the future
  if (status === "past_due" || status === "unpaid") {
    if (!stripeCtx.periodEnd || !isPeriodStillActive(toDate(stripeCtx.periodEnd), now)) {
      return {
        workosUserId: profile.workos_user_id,
        email: profile.email || "",
        displayName: profile.display_name || "",
        firstName: profile.first_name || "",
        status: MIGRATION_STATUS.EXCEPTION,
        eligibility: "past_due_unverified",
        eligible: false,
        exceptionReason: "Past-due Support without verified paid-through date",
        originalSupportPeriodStart: period.start.toISOString(),
        originalSupportPeriodEnd: period.end.toISOString(),
        periodStartSource: period.startSource,
        stripeCustomerId: profile.stripe_customer_id || null,
        stripeSubscriptionId: stripeCtx.subscription?.id || profile.stripe_subscription_id || null,
        stripeStatus: stripeCtx.stripeStatus,
        stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
        previousMembershipTier: tier,
        previousMembershipStatus: status,
        previousMembershipSource: source,
        proposedStripeCancelAtPeriodEnd: false,
        audit: {},
      };
    }
  }

  const needsCancelAtPeriodEnd =
    !!stripeCtx.subscription &&
    (stripeCtx.stripeStatus === "active" ||
      stripeCtx.stripeStatus === "trialing" ||
      stripeCtx.stripeStatus === "past_due") &&
    stripeCtx.cancelAtPeriodEnd !== true;

  return {
    workosUserId: profile.workos_user_id,
    email: profile.email || "",
    displayName: profile.display_name || "",
    firstName: profile.first_name || "",
    status: MIGRATION_STATUS.ELIGIBLE,
    eligibility: "eligible",
    eligible: true,
    exceptionReason: null,
    originalSupportPeriodStart: period.start.toISOString(),
    originalSupportPeriodEnd: period.end.toISOString(),
    periodStartSource: period.startSource,
    stripeCustomerId: profile.stripe_customer_id || null,
    stripeSubscriptionId: stripeCtx.subscription?.id || profile.stripe_subscription_id || null,
    stripeStatus: stripeCtx.stripeStatus,
    stripeCancelAtPeriodEnd: stripeCtx.cancelAtPeriodEnd,
    previousMembershipTier: tier,
    previousMembershipStatus: status,
    previousMembershipSource: source,
    proposedStripeCancelAtPeriodEnd: needsCancelAtPeriodEnd,
    _subscription: stripeCtx.subscription,
    audit: {
      periodEndSource: period.endSource,
      isSupportPrice: stripeCtx.isSupportPrice,
      stripeCustomerMismatch: stripeCtx.conflict === "stripe_customer_mismatch",
    },
  };
}

function summarizeCandidates(candidates) {
  const summary = {
    totalDiscovered: candidates.length,
    eligible: 0,
    alreadyMigrated: 0,
    alreadyPaidPro: 0,
    expired: 0,
    exceptions: 0,
    proposedStripeCancelAtPeriodEnd: 0,
    missingEmail: 0,
  };
  for (const c of candidates) {
    if (c.eligible) summary.eligible += 1;
    if (c.status === MIGRATION_STATUS.MIGRATED) summary.alreadyMigrated += 1;
    if (c.status === MIGRATION_STATUS.SKIPPED_PAID_PRO) summary.alreadyPaidPro += 1;
    if (c.status === MIGRATION_STATUS.SKIPPED_EXPIRED) summary.expired += 1;
    if (c.status === MIGRATION_STATUS.EXCEPTION) summary.exceptions += 1;
    if (c.proposedStripeCancelAtPeriodEnd) summary.proposedStripeCancelAtPeriodEnd += 1;
    if (c.eligible && !String(c.email || "").includes("@")) summary.missingEmail += 1;
  }
  return summary;
}

/**
 * Dry-run: classify all Support candidates; no writes.
 * @param {{ admin?: import('@supabase/supabase-js').SupabaseClient, stripe?: import('stripe').Stripe | null }} [opts]
 */
export async function dryRunSupportToProMigration(opts = {}) {
  const admin = opts.admin || createSupabaseAdminClient();
  if (!admin) throw new Error("supabase_admin_required");

  const profiles = await listSupportCandidateProfiles(admin);
  const candidates = [];
  for (const profile of profiles) {
    // Only evaluate current Support/access for migration action; include migrated for reporting
    const c = await classifySupportMigrationCandidate(profile, { stripe: opts.stripe || null });
    // Strip non-serializable Stripe object
    const { _subscription, ...safe } = c;
    candidates.push(safe);
  }

  return {
    migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
    dryRun: true,
    generatedAt: new Date().toISOString(),
    summary: summarizeCandidates(candidates),
    candidates,
  };
}

/**
 * Persist dry-run / classification rows (optional preview storage).
 */
async function upsertMigrationRecord(admin, candidate, { dryRun, emailStatus = null, stripeCancelApplied = false, extra = {} }) {
  const row = {
    migration_version: SUPPORT_TO_PRO_MIGRATION_VERSION,
    workos_user_id: candidate.workosUserId,
    email: candidate.email || null,
    display_name: candidate.displayName || null,
    status: candidate.status,
    eligibility: candidate.eligibility,
    exception_reason: candidate.exceptionReason,
    original_support_period_start: candidate.originalSupportPeriodStart,
    original_support_period_end: candidate.originalSupportPeriodEnd,
    period_start_source: candidate.periodStartSource,
    stripe_customer_id: candidate.stripeCustomerId,
    stripe_subscription_id: candidate.stripeSubscriptionId,
    stripe_status: candidate.stripeStatus,
    stripe_cancel_at_period_end: candidate.stripeCancelAtPeriodEnd,
    stripe_cancel_applied: stripeCancelApplied,
    previous_membership_tier: candidate.previousMembershipTier,
    previous_membership_status: candidate.previousMembershipStatus,
    previous_membership_source: candidate.previousMembershipSource,
    dry_run: dryRun,
    migrated_at: candidate.status === MIGRATION_STATUS.MIGRATED && !dryRun ? new Date().toISOString() : null,
    email_status: emailStatus,
    email_idempotency_key: migrationEmailIdempotencyKey(SUPPORT_TO_PRO_MIGRATION_VERSION, candidate.workosUserId),
    audit: { ...(candidate.audit || {}), ...extra },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from(MIGRATION_RECORDS_TABLE)
    .upsert(row, { onConflict: "migration_version,workos_user_id" })
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message || "migration_record_upsert_failed");
  return data;
}

/**
 * Apply complimentary Pro for one eligible candidate.
 */
async function applyMigrationForCandidate(admin, stripe, profile, candidate) {
  if (!candidate.eligible) {
    return { ok: false, candidate, skipped: true };
  }

  // Idempotent: already migrated with same version
  if (
    String(profile.migration_version || "") === SUPPORT_TO_PRO_MIGRATION_VERSION &&
    String(profile.membership_source || "") === SUPPORT_TO_PRO_MEMBERSHIP_SOURCE &&
    isPeriodStillActive(profile.migrated_to_pro_until)
  ) {
    candidate.status = MIGRATION_STATUS.MIGRATED;
    candidate.eligible = false;
    candidate.eligibility = "already_migrated";
    return { ok: true, candidate, skipped: true, alreadyDone: true };
  }

  // Do not overwrite newer paid Pro
  const tier = String(profile.membership_tier || "").toLowerCase();
  const source = String(profile.membership_source || "").toLowerCase();
  const status = String(profile.billing_status || profile.membership_status || "").toLowerCase();
  if (tier === "member" && source === "stripe" && (status === "active" || status === "trialing")) {
    candidate.status = MIGRATION_STATUS.SKIPPED_PAID_PRO;
    candidate.eligible = false;
    return { ok: true, candidate, skipped: true };
  }

  let stripeCancelApplied = false;
  if (candidate.proposedStripeCancelAtPeriodEnd && stripe && candidate.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(candidate.stripeSubscriptionId);
    const cust = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (candidate.stripeCustomerId && cust && cust !== candidate.stripeCustomerId) {
      throw new Error("stripe_customer_mismatch_on_cancel");
    }
    if (!sub.cancel_at_period_end) {
      await stripe.subscriptions.update(candidate.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          ...(sub.metadata || {}),
          support_to_pro_migration: SUPPORT_TO_PRO_MIGRATION_VERSION,
          membership_tier: "support",
        },
      });
      stripeCancelApplied = true;
    } else {
      stripeCancelApplied = true;
    }
  }

  const until = candidate.originalSupportPeriodEnd;
  const table = profileTableName();
  const patch = {
    membership_tier: "member",
    membership_status: "active",
    billing_status: "active",
    membership_source: SUPPORT_TO_PRO_MEMBERSHIP_SOURCE,
    renewal_date: until,
    migrated_to_pro_at: new Date().toISOString(),
    migrated_to_pro_until: until,
    migration_version: SUPPORT_TO_PRO_MIGRATION_VERSION,
    support_membership_status: SUPPORT_MEMBERSHIP_STATUS_MIGRATED,
    migration_reason: "Complimentary Pro for remainder of paid Support period",
    platform_role: resolvePlatformRoleAfterTierChange(profile.platform_role, "member"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from(table).update(patch).eq("workos_user_id", candidate.workosUserId);
  if (error) throw new Error(error.message || "profile_update_failed");

  candidate.status = MIGRATION_STATUS.MIGRATED;
  candidate.eligible = false;
  candidate.eligibility = "migrated";

  const record = await upsertMigrationRecord(admin, candidate, {
    dryRun: false,
    stripeCancelApplied,
    extra: { appliedAt: new Date().toISOString() },
  });

  return { ok: true, candidate, record, stripeCancelApplied };
}

/**
 * Send migration email once (idempotent).
 */
export async function sendSupportToProMigrationEmail(admin, candidate, migrationRecordId) {
  const email = String(candidate.email || "").trim();
  const idempotencyKey = migrationEmailIdempotencyKey(SUPPORT_TO_PRO_MIGRATION_VERSION, candidate.workosUserId);

  const { data: existing } = await admin
    .from(MIGRATION_EMAILS_TABLE)
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing && (existing.status === "sent" || existing.status === "delivered")) {
    return { ok: true, skipped: true, id: existing.provider_message_id, status: existing.status };
  }

  if (!email.includes("@")) {
    await admin.from(MIGRATION_EMAILS_TABLE).upsert(
      {
        migration_version: SUPPORT_TO_PRO_MIGRATION_VERSION,
        workos_user_id: candidate.workosUserId,
        migration_record_id: migrationRecordId || null,
        email_address: email || "missing",
        template_version: SUPPORT_TO_PRO_EMAIL_TEMPLATE_VERSION,
        idempotency_key: idempotencyKey,
        status: "failed",
        failure_reason: "missing_or_invalid_email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    );
    return { ok: false, error: "missing_or_invalid_email" };
  }

  const html = buildSupportToProMigrationEmailHtml(
    candidate.firstName || candidate.displayName,
    formatMigrationExpirationDate(candidate.originalSupportPeriodEnd),
  );

  const result = await sendResendNotificationEmail({
    to: email,
    subject: SUPPORT_TO_PRO_EMAIL_SUBJECT,
    html,
    replyTo: "support@theoutreachproject.app",
  });

  if (!result.ok) {
    await admin.from(MIGRATION_EMAILS_TABLE).upsert(
      {
        migration_version: SUPPORT_TO_PRO_MIGRATION_VERSION,
        workos_user_id: candidate.workosUserId,
        migration_record_id: migrationRecordId || null,
        email_address: email,
        template_version: SUPPORT_TO_PRO_EMAIL_TEMPLATE_VERSION,
        idempotency_key: idempotencyKey,
        status: "failed",
        failure_reason: result.error || "send_failed",
        retry_count: (existing?.retry_count || 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    );
    await admin
      .from(MIGRATION_RECORDS_TABLE)
      .update({
        email_status: "failed",
        email_error: result.error || "send_failed",
        status: MIGRATION_STATUS.EMAIL_FAILED,
        updated_at: new Date().toISOString(),
      })
      .eq("migration_version", SUPPORT_TO_PRO_MIGRATION_VERSION)
      .eq("workos_user_id", candidate.workosUserId);
    return { ok: false, error: result.error };
  }

  await admin.from(MIGRATION_EMAILS_TABLE).upsert(
    {
      migration_version: SUPPORT_TO_PRO_MIGRATION_VERSION,
      workos_user_id: candidate.workosUserId,
      migration_record_id: migrationRecordId || null,
      email_address: email,
      template_version: SUPPORT_TO_PRO_EMAIL_TEMPLATE_VERSION,
      idempotency_key: idempotencyKey,
      status: "sent",
      provider_message_id: result.id || null,
      sent_at: new Date().toISOString(),
      failure_reason: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "idempotency_key" },
  );

  await admin
    .from(MIGRATION_RECORDS_TABLE)
    .update({
      email_status: "sent",
      email_provider_id: result.id || null,
      email_sent_at: new Date().toISOString(),
      email_error: null,
      status: MIGRATION_STATUS.MIGRATED,
      updated_at: new Date().toISOString(),
    })
    .eq("migration_version", SUPPORT_TO_PRO_MIGRATION_VERSION)
    .eq("workos_user_id", candidate.workosUserId);

  return { ok: true, id: result.id };
}

/**
 * Execute migration for all eligible Support members.
 * @param {{
 *   admin?: import('@supabase/supabase-js').SupabaseClient,
 *   stripe?: import('stripe').Stripe | null,
 *   dryRun?: boolean,
 *   sendEmail?: boolean,
 *   workosUserIds?: string[],
 * }} [opts]
 */
export async function executeSupportToProMigration(opts = {}) {
  const dryRun = opts.dryRun === true;
  const sendEmail = opts.sendEmail !== false && !dryRun;
  const admin = opts.admin || createSupabaseAdminClient();
  if (!admin) throw new Error("supabase_admin_required");

  const preview = await dryRunSupportToProMigration({ admin, stripe: opts.stripe || null });
  let candidates = preview.candidates;
  if (Array.isArray(opts.workosUserIds) && opts.workosUserIds.length) {
    const allow = new Set(opts.workosUserIds.map(String));
    candidates = candidates.filter((c) => allow.has(String(c.workosUserId)));
  }

  const results = {
    migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
    dryRun,
    generatedAt: new Date().toISOString(),
    summary: { ...preview.summary },
    migrated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    stripeCancelsApplied: 0,
    errors: [],
    candidates: [],
  };

  if (dryRun) {
    for (const c of candidates) {
      try {
        await upsertMigrationRecord(admin, c, { dryRun: true });
      } catch {
        /* table may not exist yet — dry-run still returns in-memory report */
      }
    }
    results.candidates = candidates;
    return results;
  }

  const table = profileTableName();
  for (const candidate of candidates) {
    try {
      if (!candidate.eligible && candidate.status !== MIGRATION_STATUS.MIGRATED) {
        await upsertMigrationRecord(admin, candidate, { dryRun: false });
        results.candidates.push(candidate);
        continue;
      }

      const { data: profile } = await admin
        .from(table)
        .select("*")
        .eq("workos_user_id", candidate.workosUserId)
        .maybeSingle();

      if (!profile) {
        results.errors.push({ workosUserId: candidate.workosUserId, error: "profile_not_found" });
        continue;
      }

      // Re-classify with live profile for execute path
      const live = await classifySupportMigrationCandidate(profile, { stripe: opts.stripe || null });
      if (!live.eligible && live.status !== MIGRATION_STATUS.MIGRATED) {
        await upsertMigrationRecord(admin, live, { dryRun: false });
        results.candidates.push(live);
        continue;
      }

      const applied = await applyMigrationForCandidate(admin, opts.stripe || null, profile, live);
      if (applied.stripeCancelApplied) results.stripeCancelsApplied += 1;
      if (applied.ok && live.status === MIGRATION_STATUS.MIGRATED) {
        results.migrated += 1;
      }

      if (sendEmail && live.status === MIGRATION_STATUS.MIGRATED) {
        const emailResult = await sendSupportToProMigrationEmail(admin, live, applied.record?.id);
        if (emailResult.ok) {
          if (!emailResult.skipped) results.emailsSent += 1;
        } else {
          results.emailsFailed += 1;
        }
      }

      const { _subscription, ...safe } = live;
      results.candidates.push(safe);
    } catch (err) {
      results.errors.push({
        workosUserId: candidate.workosUserId,
        error: err instanceof Error ? err.message : "migration_failed",
      });
    }
  }

  results.summary = summarizeCandidates(results.candidates);
  return results;
}

/**
 * Admin report from persisted records + live Support counts.
 */
export async function getSupportToProMigrationReport(admin) {
  const client = admin || createSupabaseAdminClient();
  if (!client) throw new Error("supabase_admin_required");

  const { data: records, error } = await client
    .from(MIGRATION_RECORDS_TABLE)
    .select("*")
    .eq("migration_version", SUPPORT_TO_PRO_MIGRATION_VERSION)
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) {
    return {
      migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
      tableReady: false,
      error: error.message,
      records: [],
      counts: {},
    };
  }

  const list = Array.isArray(records) ? records : [];
  const counts = {
    total: list.length,
    migrated: 0,
    eligible: 0,
    skippedPaidPro: 0,
    skippedExpired: 0,
    exceptions: 0,
    emailSent: 0,
    emailFailed: 0,
  };
  for (const r of list) {
    if (r.status === MIGRATION_STATUS.MIGRATED) counts.migrated += 1;
    if (r.status === MIGRATION_STATUS.ELIGIBLE) counts.eligible += 1;
    if (r.status === MIGRATION_STATUS.SKIPPED_PAID_PRO) counts.skippedPaidPro += 1;
    if (r.status === MIGRATION_STATUS.SKIPPED_EXPIRED) counts.skippedExpired += 1;
    if (r.status === MIGRATION_STATUS.EXCEPTION) counts.exceptions += 1;
    if (r.email_status === "sent" || r.email_status === "delivered") counts.emailSent += 1;
    if (r.email_status === "failed" || r.status === MIGRATION_STATUS.EMAIL_FAILED) counts.emailFailed += 1;
  }

  return {
    migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
    tableReady: true,
    records: list,
    counts,
  };
}

/**
 * Verification snapshot after migration.
 */
export async function verifySupportToProMigration(admin) {
  const client = admin || createSupabaseAdminClient();
  const table = profileTableName();

  const { data: supportRows } = await client
    .from(table)
    .select("workos_user_id, membership_tier, membership_status, billing_status")
    .in("membership_tier", ["support", "access"]);

  const activeSupport = (supportRows || []).filter((r) => {
    const st = String(r.billing_status || r.membership_status || "").toLowerCase();
    return st === "active" || st === "trialing";
  });

  const { data: migratedRows } = await client
    .from(table)
    .select("workos_user_id, migrated_to_pro_until, membership_source, membership_tier")
    .eq("membership_source", SUPPORT_TO_PRO_MEMBERSHIP_SOURCE)
    .eq("membership_tier", "member");

  const now = Date.now();
  const activeMigrated = (migratedRows || []).filter((r) => {
    const until = toDate(r.migrated_to_pro_until);
    return until && until.getTime() > now;
  });

  const missingExpiry = (migratedRows || []).filter((r) => !r.migrated_to_pro_until);

  return {
    activeSupportUsers: activeSupport.length,
    activeMigratedProUsers: activeMigrated.length,
    migratedUsersMissingExpiration: missingExpiry.length,
    supportProfilesRemaining: (supportRows || []).length,
    ok: activeSupport.length === 0 && missingExpiry.length === 0,
  };
}
