export function stripeSecretConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function priceIdForTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "support") return process.env.STRIPE_PRICE_SUPPORT_MONTHLY || "";
  if (t === "member") return process.env.STRIPE_PRICE_MEMBER_MONTHLY || "";
  if (t === "sponsor") return process.env.STRIPE_PRICE_SPONSOR_MONTHLY || "";
  return "";
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
