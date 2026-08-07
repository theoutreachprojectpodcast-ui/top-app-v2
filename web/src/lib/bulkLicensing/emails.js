/**
 * Transactional emails for bulk licensing (Resend).
 * Prefer invitation links over raw license tokens in email body.
 */
import { sendResendNotificationEmail } from "@/server/email/sendResendNotificationEmail";
import { deploymentProfile } from "@/lib/runtime/appUrls";

function allowLiveEmail() {
  return deploymentProfile() === "production";
}

function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
  <h1 style="font-size:1.25rem">${title}</h1>
  ${bodyHtml}
  <p style="color:#666;font-size:0.875rem;margin-top:2rem">The Outreach Project</p>
  </body></html>`;
}

/**
 * @param {{ to: string, subject: string, html: string }} opts
 */
async function sendBulkEmail(opts) {
  if (!allowLiveEmail() && process.env.BULK_LICENSING_FORCE_EMAIL !== "1") {
    console.info("[bulk] email skipped (non-production)", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: true, skipped: true };
  }
  return sendResendNotificationEmail(opts);
}

export async function sendBulkPurchaseConfirmationEmail({
  to,
  organizationName,
  businessCode,
  packageSize,
  dashboardUrl,
}) {
  return sendBulkEmail({
    to,
    subject: `Bulk licenses confirmed — ${organizationName}`,
    html: wrapHtml(
      "Bulk license purchase confirmed",
      `<p>Your organization <strong>${organizationName}</strong> (${businessCode}) now has <strong>${packageSize}</strong> annual Outreach licenses.</p>
       <p><a href="${dashboardUrl}">Open your license dashboard</a> to assign seats to your team.</p>`,
    ),
  });
}

export async function sendBulkLicenseInvitationEmail({ to, organizationName, inviteUrl, expiresLabel }) {
  return sendBulkEmail({
    to,
    subject: `You're invited to Outreach — ${organizationName}`,
    html: wrapHtml(
      "Organization license invitation",
      `<p><strong>${organizationName}</strong> invited you to activate an Outreach membership.</p>
       <p><a href="${inviteUrl}">Accept your invitation</a></p>
       ${expiresLabel ? `<p style="color:#666">This link expires ${expiresLabel}.</p>` : ""}
       <p style="color:#666">Sign in with this email address to redeem your seat.</p>`,
    ),
  });
}

export async function sendBulkRedemptionConfirmationEmail({
  to,
  organizationName,
  expiresAt,
  memberEmail,
}) {
  return sendBulkEmail({
    to,
    subject: `License activated — ${organizationName}`,
    html: wrapHtml(
      "License activated",
      `<p>Your Outreach membership through <strong>${organizationName}</strong> is active${
        expiresAt ? ` through <strong>${new Date(expiresAt).toLocaleDateString()}</strong>` : ""
      }.</p>
       ${memberEmail ? `<p>Member: ${memberEmail}</p>` : ""}`,
    ),
  });
}

export async function sendBulkRenewalFailedEmail({ to, organizationName, portalUrl }) {
  return sendBulkEmail({
    to,
    subject: `Payment issue — ${organizationName} bulk licenses`,
    html: wrapHtml(
      "Renewal payment failed",
      `<p>We could not renew the bulk license subscription for <strong>${organizationName}</strong>.</p>
       <p><a href="${portalUrl}">Update billing</a> to avoid interruption.</p>`,
    ),
  });
}

export async function sendBulkSubscriptionCanceledEmail({ to, organizationName, endsAt }) {
  return sendBulkEmail({
    to,
    subject: `Subscription canceled — ${organizationName}`,
    html: wrapHtml(
      "Bulk subscription canceled",
      `<p>The bulk license subscription for <strong>${organizationName}</strong> is canceled${
        endsAt ? `. Access continues through <strong>${new Date(endsAt).toLocaleDateString()}</strong>` : ""
      }.</p>`,
    ),
  });
}

export async function sendBulkOrgAdminInviteEmail({ to, organizationName, inviteUrl, role }) {
  return sendBulkEmail({
    to,
    subject: `Admin access — ${organizationName}`,
    html: wrapHtml(
      "Organization admin invitation",
      `<p>You were invited as <strong>${role}</strong> for <strong>${organizationName}</strong>.</p>
       <p><a href="${inviteUrl}">Open the organization dashboard</a></p>`,
    ),
  });
}

export async function sendBulkLicenseRevocationEmail({ to, organizationName }) {
  return sendBulkEmail({
    to,
    subject: `License revoked — ${organizationName}`,
    html: wrapHtml(
      "License revoked",
      `<p>Your Outreach license through <strong>${organizationName}</strong> was revoked by an administrator.</p>`,
    ),
  });
}
