/**
 * Idempotent activation of bulk orgs / license batches from verified Stripe events.
 */
import { generateLicenseBatch } from "@/lib/bulkLicensing/licenseCodes";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";
import { mapStripeSubStatus } from "@/lib/billing/stripeProfileSync";
import { normalizeBulkPackageSize } from "@/lib/bulkLicensing/packages";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} stripeEventId
 * @param {string} eventType
 * @param {string} [environment]
 */
export async function beginBulkWebhookEvent(admin, stripeEventId, eventType, environment) {
  const { data: existing } = await admin
    .from("bulk_stripe_webhook_events")
    .select("stripe_event_id, processing_status, attempt_count")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (existing?.processing_status === "processed" || existing?.processing_status === "ignored") {
    return { proceed: false, reason: "already_done", row: existing };
  }

  const attempt = Number(existing?.attempt_count || 0) + 1;
  const { error } = await admin.from("bulk_stripe_webhook_events").upsert(
    {
      stripe_event_id: stripeEventId,
      event_type: eventType,
      environment: environment || null,
      processing_status: "processing",
      attempt_count: attempt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_event_id" },
  );
  if (error) throw error;
  return { proceed: true, reason: "claimed", attempt };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} stripeEventId
 * @param {{
 *   status: 'processed' | 'failed' | 'ignored',
 *   errorSummary?: string,
 *   organizationId?: string | null,
 *   subscriptionId?: string | null,
 *   payloadSummary?: Record<string, unknown>,
 * }} result
 */
export async function finishBulkWebhookEvent(admin, stripeEventId, result) {
  await admin
    .from("bulk_stripe_webhook_events")
    .update({
      processing_status: result.status,
      error_summary: result.errorSummary || null,
      related_organization_id: result.organizationId || null,
      related_subscription_id: result.subscriptionId || null,
      payload_summary: result.payloadSummary || {},
      processed_at: result.status === "processed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", stripeEventId);
}

/**
 * @param {import('stripe').Stripe.Subscription} sub
 */
export function subscriptionPeriodBounds(sub) {
  const startSec = sub.current_period_start;
  const endSec = sub.current_period_end;
  return {
    termStart: startSec ? new Date(startSec * 1000).toISOString() : new Date().toISOString(),
    termEnd: endSec
      ? new Date(endSec * 1000).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create or reuse subscription row + generate licenses exactly once per term.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   organizationId: string,
 *   pendingPurchaseId?: string | null,
 *   packageSize: number,
 *   stripeCustomerId?: string | null,
 *   stripeSubscription: import('stripe').Stripe.Subscription,
 *   activationSource: string,
 *   stripeInvoiceId?: string | null,
 * }} opts
 */
export async function activateBulkSubscriptionAndLicenses(admin, opts) {
  const packageSize = normalizeBulkPackageSize(opts.packageSize);
  if (!packageSize) {
    return { ok: false, error: "invalid_package_size" };
  }

  const sub = opts.stripeSubscription;
  const stripeSubId = sub.id;
  const { termStart, termEnd } = subscriptionPeriodBounds(sub);
  const priceId =
    typeof sub.items?.data?.[0]?.price?.id === "string" ? sub.items.data[0].price.id : null;
  const productId =
    typeof sub.items?.data?.[0]?.price?.product === "string"
      ? sub.items.data[0].price.product
      : sub.items?.data?.[0]?.price?.product?.id || null;

  const { data: org, error: orgErr } = await admin
    .from("bulk_organizations")
    .select("id, business_code, status")
    .eq("id", opts.organizationId)
    .maybeSingle();
  if (orgErr || !org) {
    return { ok: false, error: "organization_not_found" };
  }

  let { data: bulkSub } = await admin
    .from("bulk_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();

  if (!bulkSub) {
    const insert = {
      organization_id: opts.organizationId,
      stripe_customer_id: opts.stripeCustomerId || (typeof sub.customer === "string" ? sub.customer : null),
      stripe_subscription_id: stripeSubId,
      stripe_product_id: productId,
      stripe_price_id: priceId,
      package_size: packageSize,
      subscription_status: mapStripeSubStatus(sub.status),
      current_period_start: termStart,
      current_period_end: termEnd,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      latest_invoice_id: opts.stripeInvoiceId || null,
      pending_purchase_id: opts.pendingPurchaseId || null,
      updated_at: new Date().toISOString(),
    };
    const { data: created, error: createErr } = await admin
      .from("bulk_subscriptions")
      .insert(insert)
      .select("*")
      .maybeSingle();
    if (createErr) {
      // Race: another webhook created the row
      const { data: raced } = await admin
        .from("bulk_subscriptions")
        .select("*")
        .eq("stripe_subscription_id", stripeSubId)
        .maybeSingle();
      if (!raced) throw createErr;
      bulkSub = raced;
    } else {
      bulkSub = created;
    }
  } else {
    await admin
      .from("bulk_subscriptions")
      .update({
        subscription_status: mapStripeSubStatus(sub.status),
        current_period_start: termStart,
        current_period_end: termEnd,
        cancel_at_period_end: !!sub.cancel_at_period_end,
        latest_invoice_id: opts.stripeInvoiceId || bulkSub.latest_invoice_id,
        stripe_customer_id:
          opts.stripeCustomerId ||
          (typeof sub.customer === "string" ? sub.customer : bulkSub.stripe_customer_id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bulkSub.id);
  }

  const { data: existingBatch } = await admin
    .from("bulk_license_batches")
    .select("*")
    .eq("bulk_subscription_id", bulkSub.id)
    .eq("term_start", termStart)
    .maybeSingle();

  if (existingBatch && Number(existingBatch.generated_count) >= packageSize) {
    await admin
      .from("bulk_organizations")
      .update({
        status: sub.status === "active" || sub.status === "trialing" ? "active" : mapOrgStatus(sub.status),
        business_code_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.organizationId);

    if (opts.pendingPurchaseId) {
      await admin
        .from("bulk_pending_purchases")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", opts.pendingPurchaseId);
    }

    return {
      ok: true,
      idempotent: true,
      organizationId: opts.organizationId,
      subscriptionId: bulkSub.id,
      batchId: existingBatch.id,
      generatedCount: existingBatch.generated_count,
    };
  }

  let batch = existingBatch;
  if (!batch) {
    const { data: createdBatch, error: batchErr } = await admin
      .from("bulk_license_batches")
      .insert({
        organization_id: opts.organizationId,
        bulk_subscription_id: bulkSub.id,
        package_size: packageSize,
        business_code_snapshot: org.business_code,
        term_start: termStart,
        term_end: termEnd,
        status: "active",
        generated_count: 0,
        redeemed_count: 0,
        stripe_invoice_id: opts.stripeInvoiceId || null,
        activation_source: opts.activationSource,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();
    if (batchErr) {
      const { data: racedBatch } = await admin
        .from("bulk_license_batches")
        .select("*")
        .eq("bulk_subscription_id", bulkSub.id)
        .eq("term_start", termStart)
        .maybeSingle();
      if (!racedBatch) throw batchErr;
      batch = racedBatch;
      if (Number(batch.generated_count) >= packageSize) {
        return {
          ok: true,
          idempotent: true,
          organizationId: opts.organizationId,
          subscriptionId: bulkSub.id,
          batchId: batch.id,
          generatedCount: batch.generated_count,
        };
      }
    } else {
      batch = createdBatch;
    }
  }

  await recordBulkLicenseEvent(admin, {
    organizationId: opts.organizationId,
    eventType: "batch_created",
    actorType: "webhook",
    metadata: {
      batchId: batch.id,
      packageSize,
      termStart,
      termEnd,
      source: opts.activationSource,
    },
  });

  const { count: existingLicenseCount } = await admin
    .from("bulk_individual_licenses")
    .select("id", { count: "exact", head: true })
    .eq("license_batch_id", batch.id);

  if (Number(existingLicenseCount || 0) >= packageSize) {
    await admin
      .from("bulk_license_batches")
      .update({
        generated_count: packageSize,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch.id);
  } else {
    const licenses = generateLicenseBatch({
      businessCode: org.business_code,
      packageSize,
    });
    const rows = licenses.map((lic) => ({
      organization_id: opts.organizationId,
      license_batch_id: batch.id,
      seat_number: lic.seatNumber,
      display_code: lic.displayCode,
      secure_token_hash: lic.secureTokenHash,
      status: "available",
      expires_at: termEnd,
      updated_at: new Date().toISOString(),
    }));

    // Insert in chunks to stay under payload limits
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: licErr } = await admin.from("bulk_individual_licenses").insert(chunk);
      if (licErr) {
        // Unique violation → concurrent generation already succeeded
        if (String(licErr.code) === "23505" || /duplicate/i.test(licErr.message || "")) {
          break;
        }
        throw licErr;
      }
    }

    const { count: finalCount } = await admin
      .from("bulk_individual_licenses")
      .select("id", { count: "exact", head: true })
      .eq("license_batch_id", batch.id);

    await admin
      .from("bulk_license_batches")
      .update({
        generated_count: Number(finalCount || 0),
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    await recordBulkLicenseEvent(admin, {
      organizationId: opts.organizationId,
      eventType: "license_generated",
      actorType: "webhook",
      metadata: {
        batchId: batch.id,
        generatedCount: Number(finalCount || 0),
        packageSize,
      },
    });
  }

  await admin
    .from("bulk_organizations")
    .update({
      status: sub.status === "active" || sub.status === "trialing" ? "active" : mapOrgStatus(sub.status),
      business_code_locked: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.organizationId);

  if (opts.pendingPurchaseId) {
    await admin
      .from("bulk_pending_purchases")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", opts.pendingPurchaseId);
  }

  const { count: generatedCount } = await admin
    .from("bulk_individual_licenses")
    .select("id", { count: "exact", head: true })
    .eq("license_batch_id", batch.id);

  return {
    ok: true,
    idempotent: false,
    organizationId: opts.organizationId,
    subscriptionId: bulkSub.id,
    batchId: batch.id,
    generatedCount: Number(generatedCount || 0),
  };
}

/**
 * @param {string} stripeStatus
 */
export function mapOrgStatus(stripeStatus) {
  const s = String(stripeStatus || "").toLowerCase();
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "paused") return "suspended";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  if (s === "incomplete") return "pending_payment";
  return "pending_payment";
}

/**
 * Sync org + subscription status from Stripe without regenerating licenses.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe.Subscription} sub
 */
export async function syncBulkSubscriptionStatus(admin, sub) {
  const { data: bulkSub } = await admin
    .from("bulk_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (!bulkSub) return { ok: false, error: "subscription_not_found" };

  const { termStart, termEnd } = subscriptionPeriodBounds(sub);
  const orgStatus = mapOrgStatus(sub.status);
  const mapped = mapStripeSubStatus(sub.status);

  await admin
    .from("bulk_subscriptions")
    .update({
      subscription_status: mapped,
      current_period_start: termStart,
      current_period_end: termEnd,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bulkSub.id);

  await admin
    .from("bulk_organizations")
    .update({ status: orgStatus, updated_at: new Date().toISOString() })
    .eq("id", bulkSub.organization_id);

  if (orgStatus === "past_due" || orgStatus === "suspended") {
    await admin
      .from("bulk_license_batches")
      .update({
        status: orgStatus === "past_due" ? "past_due" : "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("bulk_subscription_id", bulkSub.id)
      .in("status", ["active", "past_due", "suspended"]);

    await recordBulkLicenseEvent(admin, {
      organizationId: bulkSub.organization_id,
      eventType: orgStatus === "past_due" ? "subscription_past_due" : "subscription_canceled",
      actorType: "stripe",
      metadata: { stripeSubscriptionId: sub.id, status: sub.status },
    });
  }

  if (orgStatus === "canceled" || orgStatus === "expired") {
    await admin
      .from("bulk_license_batches")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("bulk_subscription_id", bulkSub.id);

    await recordBulkLicenseEvent(admin, {
      organizationId: bulkSub.organization_id,
      eventType: "subscription_canceled",
      actorType: "stripe",
      metadata: { stripeSubscriptionId: sub.id, status: sub.status },
    });
  }

  return { ok: true, organizationId: bulkSub.organization_id, subscriptionId: bulkSub.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {string} [invoiceId]
 */
export async function renewBulkLicensesForSubscription(admin, sub, invoiceId) {
  const { data: bulkSub } = await admin
    .from("bulk_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (!bulkSub) return { ok: false, error: "subscription_not_found" };

  const { termStart, termEnd } = subscriptionPeriodBounds(sub);

  // Prefer extending existing seats rather than minting new codes.
  const { data: latestBatch } = await admin
    .from("bulk_license_batches")
    .select("*")
    .eq("bulk_subscription_id", bulkSub.id)
    .order("term_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: orgRow } = await admin
    .from("bulk_organizations")
    .select("business_code")
    .eq("id", bulkSub.organization_id)
    .maybeSingle();

  const { data: newBatch, error: batchErr } = await admin
    .from("bulk_license_batches")
    .upsert(
      {
        organization_id: bulkSub.organization_id,
        bulk_subscription_id: bulkSub.id,
        package_size: bulkSub.package_size,
        business_code_snapshot:
          latestBatch?.business_code_snapshot || orgRow?.business_code || "",
        term_start: termStart,
        term_end: termEnd,
        status: "active",
        generated_count: latestBatch?.generated_count || bulkSub.package_size,
        redeemed_count: latestBatch?.redeemed_count || 0,
        stripe_invoice_id: invoiceId || null,
        activation_source: "invoice.paid_renewal",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bulk_subscription_id,term_start" },
    )
    .select("*")
    .maybeSingle();

  if (batchErr) throw batchErr;

  // Roll forward seat expirations on existing license rows (same seats; no new codes).
  await admin
    .from("bulk_individual_licenses")
    .update({
      expires_at: termEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", bulkSub.organization_id)
    .in("status", ["available", "assigned", "redeemed"]);

  // Extend redeemed members' profile renewal_date
  const { data: redeemed } = await admin
    .from("bulk_individual_licenses")
    .select("redeemed_by_user_id")
    .eq("organization_id", bulkSub.organization_id)
    .eq("status", "redeemed");

  const userIds = (redeemed || [])
    .map((r) => r.redeemed_by_user_id)
    .filter(Boolean);

  if (userIds.length) {
    const { profileTableName } = await import("@/lib/supabase/admin");
    await admin
      .from(profileTableName())
      .update({
        renewal_date: termEnd,
        membership_status: "active",
        billing_status: "active",
        updated_at: new Date().toISOString(),
      })
      .in("workos_user_id", userIds)
      .eq("membership_source", "bulk_org");
  }

  await admin
    .from("bulk_organizations")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", bulkSub.organization_id);

  await admin
    .from("bulk_subscriptions")
    .update({
      subscription_status: mapStripeSubStatus(sub.status),
      current_period_start: termStart,
      current_period_end: termEnd,
      latest_invoice_id: invoiceId || bulkSub.latest_invoice_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bulkSub.id);

  await recordBulkLicenseEvent(admin, {
    organizationId: bulkSub.organization_id,
    eventType: "license_renewed",
    actorType: "stripe",
    metadata: {
      batchId: newBatch?.id,
      termStart,
      termEnd,
      invoiceId: invoiceId || null,
    },
  });

  return { ok: true, organizationId: bulkSub.organization_id, batchId: newBatch?.id };
}
