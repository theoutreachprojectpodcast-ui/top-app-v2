function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Notify platform contact routing (same Resend stack as invoice email).
 * @param {{ to: string, applicantName: string, applicantEmail: string, topic: string, bodyText: string }} opts
 */
export async function sendPodcastGuestApplicationNotify(opts) {
  const to = String(opts.to || "").trim();
  if (!to) return { ok: false, error: "missing_recipient" };

  const provider = String(process.env.ADMIN_EMAIL_PROVIDER || "resend").trim().toLowerCase();
  if (provider !== "resend") {
    return { ok: false, error: `unsupported_provider:${provider || "unset"}` };
  }
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.ADMIN_EMAIL_FROM || "").trim();
  if (!apiKey || !from) {
    return { ok: false, error: "email_provider_not_configured" };
  }

  const subject = `New Podcast Guest Application — The Outreach Project`;
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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: data?.message || "email_send_failed" };
  }
  return { ok: true, id: data?.id || "" };
}
