import { sendResendNotificationEmail } from "@/server/email/sendResendNotificationEmail";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Notify podcast guest application recipients (Resend).
 * @param {{ to: string | string[], applicantName: string, applicantEmail: string, topic: string, bodyText: string }} opts
 */
export async function sendPodcastGuestApplicationNotify(opts) {
  const subject = "New Podcast Guest Application — The Outreach Project";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New podcast guest application</h2>
      <p><strong>Applicant name:</strong> ${escapeHtml(opts.applicantName)}</p>
      <p><strong>Applicant email:</strong> ${escapeHtml(opts.applicantEmail)}</p>
      <p><strong>Topic / story (summary):</strong> ${escapeHtml(opts.topic)}</p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#f8fafc;padding:12px;border-radius:8px;">${escapeHtml(
        opts.bodyText || "",
      )}</pre>
      <p style="margin-top:16px;">Reply directly to the applicant at the email address above.</p>
    </div>
  `;

  return sendResendNotificationEmail({
    to: opts.to,
    subject,
    html,
    replyTo: opts.applicantEmail,
  });
}
