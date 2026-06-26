/**
 * Send remediation apology emails only (refunds already applied).
 * Usage: node scripts/send-billing-remediation-emails.mjs --env-file=.env.vercel.production
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    let value = s.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/[\r\n]+/g, "").trim();
  }
  return true;
}

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
loadEnvFile(
  envFileArg
    ? path.resolve(process.cwd(), envFileArg.slice("--env-file=".length))
    : path.join(__dirname, "../.env.vercel.production"),
);

const REMEDIATION_EMAIL_SUBJECT = "Correction to Your Outreach Project Membership Charge";

function remediationEmailHtml(firstName = "there") {
  const name = String(firstName || "there").trim() || "there";
  return `<p>Hi ${name},</p>
<p>We identified a billing error that caused your Outreach Project Support Membership to be charged at $99/year instead of the correct $0.99/year price.</p>
<p>We have corrected the pricing issue and are processing a refund for the difference of $98.01. Your Support Membership will remain active, and no action is needed on your end.</p>
<p>We apologize for the mistake and appreciate your understanding.</p>
<p>The Outreach Project Team</p>`;
}

async function sendEmail(to, html) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.ADMIN_EMAIL_FROM || "").trim();
  if (!apiKey || !from) return { ok: false, error: "email_provider_not_configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject: REMEDIATION_EMAIL_SUBJECT, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || "email_send_failed" };
  return { ok: true, id: data?.id || "" };
}

const recipients = [
  { email: "andy@posefitness.io", firstName: "Andy" },
];

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.ADMIN_EMAIL_FROM;
if (!apiKey || !from) {
  console.error("[send-billing-remediation-emails] RESEND not configured.");
  console.error("  Set RESEND_API_KEY and ADMIN_EMAIL_FROM in Vercel Production, then re-run.");
  process.exit(1);
}

for (const row of recipients) {
  const sent = await sendEmail(row.email, remediationEmailHtml(row.firstName));
  console.log(sent.ok ? `EMAIL OK ${row.email} (${sent.id})` : `EMAIL FAIL ${row.email}: ${sent.error}`);
  if (!sent.ok) process.exit(1);
}
