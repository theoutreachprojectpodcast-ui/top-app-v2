import { z } from "zod";

export const membershipCheckoutSchema = z.object({
  tier: z.enum(["access", "support", "member", "sponsor"]),
  returnPath: z.string().max(500).optional(),
  sponsorPackageId: z.string().max(120).optional(),
});

export const billingPortalSchema = z.object({
  returnPath: z.string().max(500).optional(),
});

export const podcastSponsorCheckoutSchema = z.object({
  tierId: z.string().min(1).max(120),
  returnPath: z.string().max(500).optional(),
});
