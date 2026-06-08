/** Display monthly prices (USD) — align with membershipTiers / Stripe products. */
export const TIER_MRR_USD = {
  support: 1,
  member: 5.99,
  sponsor: 0,
  free: 0,
};

/**
 * @param {{ support: number, pro: number, sponsor: number }} counts
 * @param {{ monthlyMemberGrowth?: number, monthlyChurnPct?: number, months?: number }} assumptions
 */
export function forecastMembershipMrr(counts, assumptions = {}) {
  const growth = Number(assumptions.monthlyMemberGrowth ?? 0) / 100;
  const churn = Number(assumptions.monthlyChurnPct ?? 0) / 100;
  const months = Math.min(24, Math.max(1, Number(assumptions.months ?? 12) || 12));
  let support = counts.support || 0;
  let pro = counts.pro || 0;
  const points = [];
  let mrr = support * TIER_MRR_USD.support + pro * TIER_MRR_USD.member;
  points.push({ month: 0, mrr: Math.round(mrr * 100) / 100 });
  for (let m = 1; m <= months; m += 1) {
    support = Math.max(0, Math.round(support * (1 - churn) + support * growth));
    pro = Math.max(0, Math.round(pro * (1 - churn) + pro * growth));
    mrr = support * TIER_MRR_USD.support + pro * TIER_MRR_USD.member;
    points.push({ month: m, mrr: Math.round(mrr * 100) / 100 });
  }
  return points;
}

/**
 * @param {{ existingSponsors: number, pipeline: number, avgDealUsd?: number }} input
 * @param {{ sponsorGrowthPct?: number, months?: number }} assumptions
 */
export function forecastSponsorRevenue(input, assumptions = {}) {
  const months = Math.min(24, Math.max(1, Number(assumptions.months ?? 12) || 12));
  const growth = Number(assumptions.sponsorGrowthPct ?? 0) / 100;
  const deal = Number(input.avgDealUsd ?? 500);
  let sponsors = input.existingSponsors || 0;
  const points = [];
  points.push({ month: 0, revenue: sponsors * deal });
  for (let m = 1; m <= months; m += 1) {
    sponsors = Math.round(sponsors * (1 + growth) + (input.pipeline || 0) * 0.05);
    points.push({ month: m, revenue: Math.round(sponsors * deal) });
  }
  return points;
}

export function scenarioMultiplier(scenario) {
  if (scenario === "conservative") return 0.85;
  if (scenario === "aggressive") return 1.2;
  return 1;
}
