function normalizeRecipients(to) {
  const list = Array.isArray(to) ? to : [to];
  return list.map((entry) => String(entry || "").trim()).filter((entry) => entry.includes("@"));
}

/**
 * @param {{ to: string | string[], subject: string, html: string, replyTo?: string }} opts
 */
export async function sendResendNotificationEmail(opts) {
  const to = normalizeRecipients(opts.to);
  if (!to.length) return { ok: false, error: "missing_recipient" };

  const provider = String(process.env.ADMIN_EMAIL_PROVIDER || "resend").trim().toLowerCase();
  if (provider !== "resend") {
    return { ok: false, error: `unsupported_provider:${provider || "unset"}` };
  }
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.ADMIN_EMAIL_FROM || "").trim();
  if (!apiKey || !from) {
    return { ok: false, error: "email_provider_not_configured" };
  }

  const emailPayload = {
    from,
    to,
    subject: String(opts.subject || "").trim() || "The Outreach Project notification",
    html: String(opts.html || ""),
  };
  const replyTo = String(opts.replyTo || "").trim();
  if (replyTo) {
    emailPayload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: data?.message || "email_send_failed" };
  }
  return { ok: true, id: data?.id || "" };
}
