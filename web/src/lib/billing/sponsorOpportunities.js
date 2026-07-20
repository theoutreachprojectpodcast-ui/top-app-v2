/**
 * Sponsor opportunities for membership checkout — single source from sponsor tier data modules.
 * Mission partners use application flow; podcast + monthly sponsor use Stripe when configured.
 */
import { formatUsd, MISSION_PARTNER_TIERS, FOUNDATIONAL_SPONSOR_TIERS, IMPACT_SPONSOR_TIERS } from "@/features/sponsors/data/sponsorTiers";
import { PODCAST_SPONSOR_TIERS } from "@/features/sponsors/data/podcastSponsorTiers";
import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorPriceIdForTier,
  stripeSponsorSubscriptionConfigured,
} from "@/lib/billing/stripeConfig";
import {
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";

/** @typedef {'free' | 'subscription' | 'one_time' | 'application'} SponsorCheckoutKind */

/**
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   family: string,
 *   familyLabel: string,
 *   amount: number,
 *   amountLabel: string,
 *   billingInterval: 'month' | 'once' | null,
 *   checkoutKind: SponsorCheckoutKind,
 *   checkoutTier?: string,
 *   podcastTierId?: string,
 *   missionTierId?: string,
 *   spotlight: string,
 *   benefits: string[],
 *   stripeConfigured: boolean,
 * }>}
 */
export function listSponsorOpportunitiesForBilling() {
  const out = [];

  if (stripeSponsorSubscriptionConfigured()) {
    out.push({
      id: "sponsor-membership-monthly",
      name: "Sponsor Membership",
      family: "account_sponsor",
      familyLabel: "Account membership",
      amount: null,
      amountLabel: "Monthly (see Stripe)",
      billingInterval: "month",
      checkoutKind: "subscription",
      checkoutTier: "sponsor",
      spotlight: "Recurring sponsor account tier with platform-wide sponsor designation.",
      benefits: [
        "Sponsor badge on profile",
        "Priority partnership routing",
        "Aligned to sponsor membership onboarding",
      ],
      stripeConfigured: true,
    });
  }

  for (const tier of PODCAST_SPONSOR_TIERS) {
    const priceOk = !!podcastSponsorPriceIdForTier(tier.id);
    out.push({
      id: tier.id,
      name: tier.name,
      family: tier.family,
      familyLabel: tier.familyLabel,
      amount: tier.amount,
      amountLabel: formatUsd(tier.amount),
      billingInterval: "once",
      checkoutKind: priceOk ? "one_time" : "application",
      podcastTierId: tier.id,
      spotlight: tier.spotlight,
      benefits: tier.fullBenefits || [],
      stripeConfigured: priceOk && podcastSponsorCheckoutConfigured(),
    });
  }

  for (const tier of MISSION_PARTNER_TIERS) {
    out.push({
      id: tier.id,
      name: tier.name,
      family: tier.family,
      familyLabel: tier.familyLabel,
      amount: tier.amount,
      amountLabel: formatUsd(tier.amount),
      billingInterval: "once",
      checkoutKind: "application",
      missionTierId: tier.id,
      spotlight: tier.spotlight,
      benefits: tier.fullBenefits || [],
      stripeConfigured: false,
    });
  }

  for (const tier of FOUNDATIONAL_SPONSOR_TIERS) {
    out.push({
      id: tier.id,
      name: tier.name,
      family: tier.family,
      familyLabel: tier.familyLabel,
      amount: tier.amount,
      amountLabel: formatUsd(tier.amount),
      billingInterval: "once",
      checkoutKind: "application",
      missionTierId: tier.id,
      spotlight: tier.spotlight,
      benefits: tier.fullBenefits || [],
      stripeConfigured: false,
    });
  }

  for (const tier of IMPACT_SPONSOR_TIERS) {
    out.push({
      id: tier.id,
      name: tier.name,
      family: tier.family,
      familyLabel: tier.familyLabel,
      amount: tier.amount,
      amountLabel: formatUsd(tier.amount),
      billingInterval: "once",
      checkoutKind: "application",
      missionTierId: tier.id,
      spotlight: tier.spotlight,
      benefits: tier.fullBenefits || [],
      stripeConfigured: false,
    });
  }

  return out;
}

export function listMembershipPlansForHome() {
  return [
    {
      tierKey: "none",
      checkoutTier: null,
      label: "Free Member",
      priceLabel: "Free",
      description: "Create an account, then subscribe to Pro to unlock the platform.",
      cta: "Join Free",
    },
    {
      tierKey: "member",
      checkoutTier: "member",
      label: "Pro Member",
      priceLabel: PRO_MEMBERSHIP_PRICE_LABEL,
      description: "Full platform access — directory, community, podcast, and trusted resources.",
      cta: "Become a Pro Member",
    },
  ];
}

export function getSponsorOpportunityById(id) {
  return listSponsorOpportunitiesForBilling().find((o) => o.id === id) || null;
}
