import { z } from "zod";

const email = z.string().trim().email().max(320);

export const adminInvoiceSchema = z.object({
  workosUserId: z.string().trim().min(1).max(200),
  recipientEmail: email,
  recipientName: z.string().trim().max(240).optional(),
  reason: z.string().trim().min(1).max(2000),
  paymentUrl: z.string().trim().url().max(2000),
  notes: z.string().trim().max(4000).optional(),
  amount: z.union([z.string(), z.number()]),
});

export const adminUserInviteSchema = z.object({
  email,
  role: z.string().trim().max(80).optional(),
});

export const adminMagicLinkSchema = z.object({
  email,
  returnTo: z.string().trim().max(500).optional(),
});
