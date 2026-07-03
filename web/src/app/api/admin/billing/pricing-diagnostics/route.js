import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import Stripe from "stripe";
import {
  proSubscriptionPriceId,
  stripeSecretConfigured,
  supportSubscriptionPriceId,
} from "@/lib/billing/stripeConfig";
import {
  PRO_MEMBERSHIP_ANNUAL_CENTS,
  SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
  blockedMembershipPriceIds,
} from "@/lib/billing/membershipPricing";
import { validateMembershipStripePrice } from "@/lib/billing/stripePriceValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolvePriceDiagnostics(stripe, tier, priceId) {
  if (!priceId) {
    return { tier, priceId: null, ok: false, message: "Price ID not configured in environment." };
  }
  const v = await validateMembershipStripePrice(stripe, tier, priceId);
  return {
    tier,
    priceId,
    ok: v.ok,
    blocked: v.blocked,
    unitAmount: v.unitAmount,
    unitAmountUsd: v.unitAmount != null ? v.unitAmount / 100 : null,
    currency: v.currency,
    interval: v.interval,
    expectedCents: v.expectedCents,
    expectedUsd: v.expectedCents != null ? v.expectedCents / 100 : null,
    code: v.code || null,
    message: v.message || null,
  };
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  if (!stripeSecretConfigured()) {
    return Response.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supportId = supportSubscriptionPriceId();
  const proId = proSubscriptionPriceId();

  const [support, member] = await Promise.all([
    resolvePriceDiagnostics(stripe, "support", supportId),
    resolvePriceDiagnostics(stripe, "member", proId),
  ]);

  return Response.json({
    ok: support.ok && member.ok,
    expected: {
      supportAnnualCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
      proAnnualCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
      currency: "usd",
      interval: "year",
    },
    envPriceIds: {
      STRIPE_PRICE_SUPPORT_YEARLY: supportId,
      STRIPE_PRICE_PRO_YEARLY: proId,
    },
    blockedPriceIds: [...blockedMembershipPriceIds()],
    tiers: { support, member },
    checkoutSafe: support.ok && member.ok,
  });
}
