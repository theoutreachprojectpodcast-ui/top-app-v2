/**
 * Stripe metadata markers that identify bulk org checkout / subscriptions.
 * Kept separate from webhookHandler to avoid import cycles with stripeProfileSync.
 */

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
