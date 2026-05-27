import assert from "node:assert/strict";
import { contactFormSchema, guestApplicationSchema } from "../src/lib/security/schemas/publicSchemas.js";
import { membershipCheckoutSchema } from "../src/lib/security/schemas/billingSchemas.js";
import { adminInvoiceSchema, adminMagicLinkSchema } from "../src/lib/security/schemas/adminSchemas.js";
import { validateImageUpload } from "../src/lib/security/uploadPolicy.js";

assert.equal(contactFormSchema.safeParse({ fullName: "A", email: "a@b.com", message: "hi" }).success, true);
assert.equal(contactFormSchema.safeParse({ fullName: "", email: "bad", message: "" }).success, false);
assert.equal(membershipCheckoutSchema.safeParse({ tier: "member" }).success, true);
assert.equal(membershipCheckoutSchema.safeParse({ tier: "hacker" }).success, false);
assert.equal(
  guestApplicationSchema.safeParse({
    full_name: "Jane",
    email: "jane@example.com",
    topic_pitch: "Topic",
  }).success,
  true,
);
assert.equal(
  adminInvoiceSchema.safeParse({
    workosUserId: "user_01",
    recipientEmail: "pay@example.com",
    reason: "Sponsor",
    paymentUrl: "https://pay.example.com",
    amount: "100",
  }).success,
  true,
);
assert.equal(adminMagicLinkSchema.safeParse({ email: "admin@example.com" }).success, true);

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const pngFile = new File([png], "avatar.png", { type: "image/png" });
const valid = await validateImageUpload(pngFile);
assert.equal(valid.ok, true);

const fake = new File([new Uint8Array([0, 0, 0])], "evil.png", { type: "image/png" });
const invalid = await validateImageUpload(fake);
assert.equal(invalid.ok, false);
assert.equal(invalid.error, "content_type_mismatch");

console.log("[security-guards-smoke] all checks passed");
