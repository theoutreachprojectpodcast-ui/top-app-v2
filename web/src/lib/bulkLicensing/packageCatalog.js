/**
 * Public package catalog for bulk licensing UI (no secrets).
 * Amounts come from Stripe Price objects when the secret key is available.
 */
import Stripe from "stripe";
import {
  BULK_PACKAGE_SIZES,
  bulkCheckoutConfigured,
  bulkMissingPriceEnvKeys,
  bulkPriceIdForPackageSize,
} from "@/lib/bulkLicensing/packages";
import { stripeSecretConfigured, stripeWebhookConfigured } from "@/lib/billing/stripeConfig";
import { deploymentProfile } from "@/lib/runtime/appUrls";

/**
 * @returns {Promise<{
 *   packages: Array<{
 *     size: number,
 *     label: string,
 *     priceIdConfigured: boolean,
 *     amountCents: number | null,
 *     currency: string | null,
 *     interval: string | null,
 *     displayPrice: string | null,
 *   }>,
 *   checkoutConfigured: boolean,
 *   missingEnvKeys: string[],
 *   environment: string,
 *   stripeMode: 'test' | 'live' | 'unknown',
 * }>}
 */
export async function getBulkPackageCatalog() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const stripeMode = !key
    ? "unknown"
    : key.startsWith("sk_live")
      ? "live"
      : key.startsWith("sk_test")
        ? "test"
        : "unknown";

  /** @type {import('stripe').Stripe | null} */
  let stripe = null;
  if (key) {
    try {
      stripe = new Stripe(key);
    } catch {
      stripe = null;
    }
  }

  const packages = [];
  for (const size of BULK_PACKAGE_SIZES) {
    const priceId = bulkPriceIdForPackageSize(size);
    let amountCents = null;
    let currency = null;
    let interval = null;
    if (stripe && priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        amountCents = typeof price.unit_amount === "number" ? price.unit_amount : null;
        currency = price.currency || null;
        interval = price.recurring?.interval || null;
      } catch {
        // leave null — UI still shows package without amount
      }
    }
    packages.push({
      size,
      label: `${size} Licenses`,
      priceIdConfigured: !!priceId,
      priceId: priceId || null,
      amountCents,
      currency,
      interval,
      displayPrice:
        amountCents != null && currency
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currency.toUpperCase(),
            }).format(amountCents / 100) + (interval === "year" ? "/yr" : "")
          : null,
    });
  }

  return {
    packages,
    checkoutConfigured: bulkCheckoutConfigured(),
    missingEnvKeys: bulkMissingPriceEnvKeys(),
    environment: deploymentProfile(),
    stripeMode,
    webhookConfigured: stripeWebhookConfigured(),
    secretConfigured: stripeSecretConfigured(),
  };
}
