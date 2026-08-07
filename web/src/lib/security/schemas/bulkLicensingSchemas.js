import { z } from "zod";
import { BULK_PACKAGE_SIZES } from "@/lib/bulkLicensing/packageSizes";

export const bulkCheckoutSchema = z.object({
  organizationName: z.string().min(2).max(200),
  purchaserName: z.string().min(2).max(200),
  workEmail: z.string().email().max(320),
  billingEmail: z.string().email().max(320).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  organizationType: z.string().max(120).optional().or(z.literal("")),
  packageSize: z.number().refine((n) => BULK_PACKAGE_SIZES.includes(n), {
    message: "packageSize must be 25, 50, 100, or 200",
  }),
  businessCode: z.string().min(2).max(32),
  purchaseOrderRef: z.string().max(120).optional().or(z.literal("")),
  agreedAutoRenewal: z.literal(true),
  agreedLicenseTerms: z.literal(true),
});

export const bulkRedeemSchema = z.object({
  licenseCode: z.string().min(6).max(80).optional(),
  inviteToken: z.string().min(8).max(200).optional(),
});

export const bulkAssignSchema = z.object({
  emails: z.array(z.string().email().max(320)).min(1).max(200),
});

export const bulkPortalSchema = z.object({
  returnPath: z.string().max(500).optional(),
});
