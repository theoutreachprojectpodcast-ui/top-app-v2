import { listSponsorOpportunitiesForBilling } from "@/lib/billing/sponsorOpportunities";

export async function GET() {
  return Response.json({ opportunities: listSponsorOpportunitiesForBilling() });
}
