/**
 * Stripe webhook handlers for bulk licensing (called from billing webhook).
 */
import { deploymentProfile } from "@/lib/runtime/appUrls";
import {
  activateBulkSubscriptionAndLicenses,
  beginBulkWebhookEvent,
  finishBulkWebhookEvent,
  renewBulkLicensesForSubscription,
  syncBulkSubscriptionStatus,
} from "@/lib/bulkLicensing/activateFromStripe";
import {
  sendBulkPurchaseConfirmationEmail,
  sendBulkRenewalFailedEmail,
  sendBulkSubscriptionCanceledEmail,
} from "@/lib/bulkLicensing/emails";
import { appBaseUrl } from "@/lib/billing/stripeConfig";
import { normalizeBulkPackageSize } from "@/lib/bulkLicensing/packages";

/**
 * @param {Record<string, string | undefined> | null | undefined} metadata
 */
export function isBulkCheckoutMetadata(metadata) {
  if (!metadata) return false;
  return (
    String(metadata.checkout_kind || "") === "bulk_licensing" ||
    !!metadata.bulk_organization_id ||
    !!metadata.bulk_purchase_id
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 * @param {import('stripe').Stripe.Event} event
 */
export async function handleBulkStripeWebhookEvent(admin, stripe, event) {
  const maybeBulk = await eventLooksLikeBulk(admin, event);
  if (!maybeBulk) {
    return { handled: false };
  }

  const claim = await beginBulkWebhookEvent(
    admin,
    event.id,
    event.type,
    deploymentProfile(),
  );
  if (!claim.proceed) {
    return { handled: true, skipped: true, reason: claim.reason };
  }

  try {
    let result = { ok: true, ignored: true };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (event.data.object);
        result = await processBulkCheckoutCompleted(admin, stripe, session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
        result = await syncBulkSubscriptionStatus(admin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = /** @type {import('stripe').Stripe.Subscription} */ (event.data.object);
        const { data: known } = await admin
          .from("bulk_subscriptions")
          .select("id, organization_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        result = await syncBulkSubscriptionStatus(admin, sub);
        if (known) {
          const { data: org } = await admin
            .from("bulk_organizations")
            .select("name, billing_email, purchaser_email")
            .eq("id", known.organization_id)
            .maybeSingle();
          if (org) {
            await sendBulkSubscriptionCanceledEmail({
              to: org.billing_email || org.purchaser_email,
              organizationName: org.name,
              endsAt: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
            });
          }
        }
        break;
      }
      case "invoice.paid": {
        const invoice = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        const { data: known } = await admin
          .from("bulk_subscriptions")
          .select("id, organization_id, package_size")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (!known) {
          await finishBulkWebhookEvent(admin, event.id, { status: "ignored" });
          return { handled: false };
        }
        const sub = await stripe.subscriptions.retrieve(subId);
        const { count: batchCount } = await admin
          .from("bulk_license_batches")
          .select("id", { count: "exact", head: true })
          .eq("bulk_subscription_id", known.id);
        if (!batchCount) {
          const size =
            normalizeBulkPackageSize(sub.metadata?.package_size) ||
            normalizeBulkPackageSize(known.package_size);
          result = await activateBulkSubscriptionAndLicenses(admin, {
            organizationId: known.organization_id,
            packageSize: size,
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
            stripeSubscription: sub,
            activationSource: "invoice.paid",
            stripeInvoiceId: invoice.id,
            pendingPurchaseId: sub.metadata?.bulk_purchase_id || null,
          });
        } else {
          result = await renewBulkLicensesForSubscription(admin, sub, invoice.id);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = /** @type {import('stripe').Stripe.Invoice} */ (event.data.object);
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        const { data: known } = await admin
          .from("bulk_subscriptions")
          .select("id, organization_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (!known) {
          await finishBulkWebhookEvent(admin, event.id, { status: "ignored" });
          return { handled: false };
        }
        const sub = await stripe.subscriptions.retrieve(subId);
        result = await syncBulkSubscriptionStatus(admin, sub);
        const { data: org } = await admin
          .from("bulk_organizations")
          .select("name, billing_email, purchaser_email")
          .eq("id", known.organization_id)
          .maybeSingle();
        if (org) {
          await sendBulkRenewalFailedEmail({
            to: org.billing_email || org.purchaser_email,
            organizationName: org.name,
            portalUrl: `${appBaseUrl()}/organizations/${known.organization_id}`,
          });
        }
        break;
      }
      default:
        await finishBulkWebhookEvent(admin, event.id, { status: "ignored" });
        return { handled: false };
    }

    await finishBulkWebhookEvent(admin, event.id, {
      status: result?.ok === false ? "failed" : "processed",
      errorSummary: result?.ok === false ? result.error || "failed" : null,
      organizationId: result?.organizationId || null,
      subscriptionId: result?.subscriptionId || null,
      payloadSummary: { type: event.type },
    });

    return { handled: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bulk] webhook processing failed", { id: event.id, type: event.type, message });
    await finishBulkWebhookEvent(admin, event.id, {
      status: "failed",
      errorSummary: message.slice(0, 500),
    });
    throw err;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe.Event} event
 */
async function eventLooksLikeBulk(admin, event) {
  const obj = event.data?.object || {};
  const meta = obj.metadata || {};
  if (isBulkCheckoutMetadata(meta)) return true;

  if (event.type.startsWith("customer.subscription.") && obj.id) {
    const { data } = await admin
      .from("bulk_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", obj.id)
      .maybeSingle();
    return !!data;
  }

  if (event.type.startsWith("invoice.") && obj.subscription) {
    const subId =
      typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
    if (!subId) return false;
    const { data } = await admin
      .from("bulk_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subId)
      .maybeSingle();
    return !!data;
  }

  return false;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 * @param {import('stripe').Stripe.Checkout.Session} session
 */
async function processBulkCheckoutCompleted(admin, stripe, session) {
  const orgId = String(session.metadata?.bulk_organization_id || "").trim();
  const purchaseId = String(session.metadata?.bulk_purchase_id || "").trim();
  const packageSize =
    normalizeBulkPackageSize(session.metadata?.package_size) ||
    normalizeBulkPackageSize(
      (
        await admin
          .from("bulk_pending_purchases")
          .select("package_size")
          .eq("id", purchaseId)
          .maybeSingle()
      ).data?.package_size,
    );

  if (!orgId || !packageSize) {
    return { ok: false, error: "missing_bulk_metadata" };
  }

  const subId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subId) {
    return { ok: false, error: "missing_subscription" };
  }

  const sub = await stripe.subscriptions.retrieve(subId);
  // Ensure metadata on subscription for later events
  if (!sub.metadata?.bulk_organization_id) {
    await stripe.subscriptions.update(subId, {
      metadata: {
        ...sub.metadata,
        checkout_kind: "bulk_licensing",
        bulk_organization_id: orgId,
        bulk_purchase_id: purchaseId,
        package_size: String(packageSize),
        workos_user_id: session.metadata?.workos_user_id || "",
        deployment_profile: session.metadata?.deployment_profile || "",
      },
    });
  }

  const cust =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;

  if (purchaseId) {
    await admin
      .from("bulk_pending_purchases")
      .update({
        stripe_checkout_session_id: session.id,
        status: "checkout_created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseId);
  }

  const activated = await activateBulkSubscriptionAndLicenses(admin, {
    organizationId: orgId,
    pendingPurchaseId: purchaseId || null,
    packageSize,
    stripeCustomerId: cust,
    stripeSubscription: sub,
    activationSource: "checkout.session.completed",
  });

  if (activated.ok && !activated.idempotent) {
    const { data: org } = await admin
      .from("bulk_organizations")
      .select("name, business_code, billing_email, purchaser_email")
      .eq("id", orgId)
      .maybeSingle();
    if (org) {
      await sendBulkPurchaseConfirmationEmail({
        to: org.billing_email || org.purchaser_email,
        organizationName: org.name,
        businessCode: org.business_code,
        packageSize,
        dashboardUrl: `${appBaseUrl()}/organizations/${orgId}`,
      });
    }
  }

  return activated;
}
