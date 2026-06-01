import { z } from "zod";

const email = z.string().trim().email().max(320);
const shortText = z.string().trim().max(4000);

export const contactFormSchema = z.object({
  fullName: z.string().trim().min(1).max(240),
  email,
  phone: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(400).optional(),
  message: z.string().trim().min(1).max(8000),
  routingKey: z.string().trim().max(120).optional(),
});

export const trustedApplicationNotifySchema = z.object({
  applicationId: z.string().uuid(),
});

export const guestApplicationSchema = z.object({
  full_name: z.string().trim().min(1).max(240),
  email,
  organization: z.string().trim().max(400).optional(),
  website_url: z
    .string()
    .trim()
    .max(800)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), { message: "Invalid website URL" }),
  topic_pitch: z.string().trim().min(1).max(4000),
  why_now: shortText.optional(),
  social_links: shortText.optional(),
  phone: z.string().trim().max(80).optional(),
  role_title: z.string().trim().max(240).optional(),
  message: z.string().trim().max(8000).optional(),
  community_context: z.string().trim().max(4000).optional(),
});
