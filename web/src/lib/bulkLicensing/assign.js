/**
 * Assign / unassign seats, invitation tokens.
 */
import { createHash, randomBytes } from "node:crypto";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";
import { sendBulkLicenseInvitationEmail } from "@/lib/bulkLicensing/emails";
import { appBaseUrl } from "@/lib/billing/stripeConfig";

const DEFAULT_INVITE_DAYS = 14;

function hashInviteToken(token) {
  return createHash("sha256").update(String(token), "utf8").digest("hex");
}

function newInviteToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   organizationId: string,
 *   emails: string[],
 *   actorUserId: string,
 *   inviteDays?: number,
 * }} opts
 */
export async function assignLicensesByEmail(admin, opts) {
  const emails = [...new Set(opts.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  const { data: available } = await admin
    .from("bulk_individual_licenses")
    .select("id, seat_number, display_code, status")
    .eq("organization_id", opts.organizationId)
    .eq("status", "available")
    .order("seat_number", { ascending: true })
    .limit(emails.length);

  const seats = available || [];
  if (seats.length < emails.length) {
    return {
      ok: false,
      error: "insufficient_seats",
      message: `Only ${seats.length} available seat(s); need ${emails.length}.`,
      available: seats.length,
      requested: emails.length,
    };
  }

  const { data: org } = await admin
    .from("bulk_organizations")
    .select("name, status")
    .eq("id", opts.organizationId)
    .maybeSingle();

  if (!org || org.status !== "active") {
    return { ok: false, error: "organization_inactive", message: "Organization is not active." };
  }

  const inviteDays = opts.inviteDays ?? DEFAULT_INVITE_DAYS;
  const expiresAt = new Date(Date.now() + inviteDays * 24 * 60 * 60 * 1000).toISOString();
  const base = appBaseUrl();
  /** @type {Array<{ email: string, licenseId: string, inviteUrl: string }>} */
  const assigned = [];

  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i];
    const seat = seats[i];
    const token = newInviteToken();
    const now = new Date().toISOString();

    const { data: updated, error } = await admin
      .from("bulk_individual_licenses")
      .update({
        status: "assigned",
        assigned_email: email,
        assigned_at: now,
        assigned_user_id: null,
        invitation_token_hash: hashInviteToken(token),
        invitation_expires_at: expiresAt,
        updated_at: now,
      })
      .eq("id", seat.id)
      .eq("status", "available")
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      return {
        ok: false,
        error: "assign_failed",
        message: `Failed to assign seat for ${email}.`,
        assigned,
      };
    }

    const inviteUrl = `${base}/invite/license/${token}`;
    await sendBulkLicenseInvitationEmail({
      to: email,
      organizationName: org.name,
      inviteUrl,
      expiresLabel: `on ${new Date(expiresAt).toLocaleDateString()}`,
    });

    await recordBulkLicenseEvent(admin, {
      organizationId: opts.organizationId,
      licenseId: seat.id,
      eventType: "license_assigned",
      actorUserId: opts.actorUserId,
      actorType: "user",
      metadata: { email, seatNumber: seat.seat_number },
    });

    await recordBulkLicenseEvent(admin, {
      organizationId: opts.organizationId,
      licenseId: seat.id,
      eventType: "invitation_sent",
      actorUserId: opts.actorUserId,
      actorType: "user",
      metadata: { email },
    });

    assigned.push({ email, licenseId: seat.id, inviteUrl });
  }

  return { ok: true, assigned };
}

/**
 * Return an assigned (unredeemed) seat to the pool.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ licenseId: string, organizationId: string, actorUserId: string }} opts
 */
export async function cancelLicenseAssignment(admin, opts) {
  const { data: license } = await admin
    .from("bulk_individual_licenses")
    .select("*")
    .eq("id", opts.licenseId)
    .eq("organization_id", opts.organizationId)
    .maybeSingle();

  if (!license) return { ok: false, error: "not_found" };
  if (license.status === "redeemed") {
    return { ok: false, error: "already_redeemed", message: "Redeemed licenses cannot be returned to the pool." };
  }
  if (license.status !== "assigned") {
    return { ok: false, error: "not_assigned", message: "License is not in an assigned state." };
  }

  const now = new Date().toISOString();
  await admin
    .from("bulk_individual_licenses")
    .update({
      status: "available",
      assigned_email: null,
      assigned_user_id: null,
      assigned_at: null,
      invitation_token_hash: null,
      invitation_expires_at: null,
      updated_at: now,
    })
    .eq("id", license.id);

  await recordBulkLicenseEvent(admin, {
    organizationId: opts.organizationId,
    licenseId: license.id,
    eventType: "license_reassigned",
    actorUserId: opts.actorUserId,
    actorType: "user",
    metadata: { action: "cancel_assignment" },
  });

  return { ok: true };
}

/**
 * Resolve invitation link token → license (for redeem UI).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} inviteToken
 */
export async function resolveLicenseInvitation(admin, inviteToken) {
  const hash = hashInviteToken(String(inviteToken || "").trim());
  if (!hash || hash.length < 10) return { ok: false, error: "invalid_token" };

  const { data: license } = await admin
    .from("bulk_individual_licenses")
    .select("id, organization_id, status, assigned_email, invitation_expires_at, display_code, seat_number")
    .eq("invitation_token_hash", hash)
    .maybeSingle();

  if (!license) return { ok: false, error: "not_found" };
  if (license.status === "redeemed") return { ok: false, error: "already_redeemed" };
  if (license.status !== "assigned") return { ok: false, error: "invalid_status" };
  if (license.invitation_expires_at && new Date(license.invitation_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }

  const { data: org } = await admin
    .from("bulk_organizations")
    .select("id, name, business_code, status")
    .eq("id", license.organization_id)
    .maybeSingle();

  return {
    ok: true,
    licenseId: license.id,
    organizationId: license.organization_id,
    organizationName: org?.name || "",
    businessCode: org?.business_code || "",
    assignedEmail: license.assigned_email,
    seatNumber: license.seat_number,
    // Full display code is NOT returned here — invitation redeem uses license id after auth
  };
}
