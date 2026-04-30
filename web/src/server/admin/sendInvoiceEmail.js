function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendInvoiceEmail({
  to,
  recipientName,
  amountDisplay,
  reason,
  paymentUrl,
  notes,
}) {
  const provider = String(process.env.ADMIN_EMAIL_PROVIDER || "resend").trim().toLowerCase();
  if (provider !== "resend") {
    return { ok: false, error: `unsupported_provider:${provider || "unset"}` };
  }
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.ADMIN_EMAIL_FROM || "").trim();
  if (!apiKey || !from) {
    return { ok: false, error: "email_provider_not_configured" };
  }

  const subject = `Invoice from The Outreach Project: ${amountDisplay}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">The Outreach Project</h2>
      <p>Hello ${escapeHtml(recipientName || "there")},</p>
      <p>Your invoice is ready.</p>
      <ul>
        <li><strong>Amount:</strong> ${escapeHtml(amountDisplay)}</li>
        <li><strong>Reason:</strong> ${escapeHtml(reason)}</li>
      </ul>
      <p><a href="${escapeHtml(paymentUrl)}">Pay invoice</a></p>
      ${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ""}
      <p>If you have questions, reply to this email.</p>
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
