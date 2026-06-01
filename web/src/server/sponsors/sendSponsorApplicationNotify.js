import { sendResendNotificationEmail } from "@/server/email/sendResendNotificationEmail";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * @param {{ to: string | string[], application: Record<string, unknown>, heading: string, subjectPrefix: string }} opts
 */
export async function sendSponsorApplicationNotify(opts) {
  const app = opts.application || {};
  const company = String(app.company_name || "").trim();
  const tier = String(app.sponsor_tier_name || "").trim();
  const applicantEmail = String(app.email || "").trim();
  const subject = `${opts.subjectPrefix} — ${company || "The Outreach Project"}`;
  const bodyText = String(app.bodyText || "").trim();
  const tierAmountLine = app.sponsor_tier_amount_display
    ? ` (${escapeHtml(app.sponsor_tier_amount_display)})`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">${escapeHtml(opts.heading)}</h2>
      <p><strong>Company:</strong> ${escapeHtml(company)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(app.first_name)} ${escapeHtml(app.last_name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(applicantEmail)}</p>
      ${app.phone ? `<p><strong>Phone:</strong> ${escapeHtml(app.phone)}</p>` : ""}
      <p><strong>Tier:</strong> ${escapeHtml(tier)}${tierAmountLine}</p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#f8fafc;padding:12px;border-radius:8px;">${escapeHtml(
        bodyText,
      )}</pre>
      <p style="margin-top:16px;">Reply directly to the applicant at the email address above.</p>
    </div>
  `;

  return sendResendNotificationEmail({
    to: opts.to,
    subject,
    html,
    replyTo: applicantEmail,
  });
}
