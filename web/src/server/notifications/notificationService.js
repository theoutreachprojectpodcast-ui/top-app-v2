/**
 * Central notification creation + fan-out (service-role Supabase only).
 * Email/push: set `delivered_email_at` in a future worker; see docs/NOTIFICATIONS_TORP_V03.md.
 */

import { profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

const NOTIFICATIONS_TABLE = "torp_platform_notifications";
const ORG_UPDATES_TABLE = "torp_org_public_updates";
const SAVED_ORG_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

function parseList(raw) {
  return String(raw || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve moderator/staff recipient profile UUIDs from env allow-lists.
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
export async function listStaffRecipientProfileIds(admin) {
  if (!admin) return [];
  const ids = new Set();
  const workosIds = parseList(
    process.env.COMMUNITY_MODERATOR_WORKOS_USER_IDS || process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_USER_IDS
  );
  const emails = parseList(
    process.env.COMMUNITY_MODERATOR_EMAILS || process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_EMAILS
  );

  for (const w of workosIds) {
    const row = await getProfileRowByWorkOSId(admin, w);
    if (row?.id) ids.add(String(row.id));
  }

  const table = profileTableName();
  for (const email of emails) {
    for (const variant of [email, email.toLowerCase()]) {
      const { data } = await admin.from(table).select("id").eq("email", variant).maybeSingle();
      if (data?.id) {
        ids.add(String(data.id));
        break;
      }
    }
  }

  return [...ids];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {object} p
 */
export async function createPlatformNotification(admin, p) {
  if (!admin || !p.recipientProfileId) return { ok: false, reason: "invalid" };
  const now = new Date().toISOString();
  const row = {
    recipient_profile_id: p.recipientProfileId,
    audience_scope: p.audienceScope === "staff" ? "staff" : "user",
    notification_type: String(p.type || "account_update"),
    title: String(p.title || "Update").slice(0, 500),
    message: p.message ? String(p.message).slice(0, 8000) : null,
    link_path: p.linkPath ? String(p.linkPath).slice(0, 2000) : null,
    entity_type: p.entityType ? String(p.entityType).slice(0, 120) : null,
    entity_id: p.entityId != null ? String(p.entityId).slice(0, 200) : null,
    status: "unread",
    priority: ["low", "high"].includes(p.priority) ? p.priority : "normal",
    delivered_in_app_at: now,
    delivered_email_at: null,
    metadata: p.metadata && typeof p.metadata === "object" ? p.metadata : {},
    created_at: now,
    updated_at: now,
  };

  const { error } = await admin.from(NOTIFICATIONS_TABLE).insert(row);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/**
 * Skip if an unread notification of same type + entity exists recently (dedupe).
 */
export async function createNotificationDeduped(admin, p, opts = {}) {
  const windowHours = p.dedupeHours ?? opts.windowHours ?? 48;
  const { dedupeHours: _d, ...rest } = p;
  if (!admin || !rest.recipientProfileId || !rest.entityId) {
    return createPlatformNotification(admin, rest);
  }
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data: existing } = await admin
    .from(NOTIFICATIONS_TABLE)
    .select("id")
    .eq("recipient_profile_id", rest.recipientProfileId)
    .eq("notification_type", String(rest.type))
    .eq("entity_id", String(rest.entityId))
    .eq("status", "unread")
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, skipped: true };
  return createPlatformNotification(admin, rest);
}

/**
 * Notify every configured staff profile (moderators).
 */
export async function notifyStaffProfiles(admin, payload) {
  const { dedupeHours, ...restPayload } = payload;
  const ids = await listStaffRecipientProfileIds(admin);
  const out = [];
  for (const recipientProfileId of ids) {
    const r = await createNotificationDeduped(
      admin,
      { ...restPayload, recipientProfileId, audienceScope: "staff", dedupeHours: dedupeHours ?? 24 },
      { windowHours: dedupeHours ?? 24 }
    );
    out.push(r);
  }
  return { ok: true, recipients: ids.length, results: out };
}

/**
 * Record a public org update and notify users who saved that EIN.
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
export async function publishOrgPublicUpdateAndNotifyFans(admin, params) {
  const ein = String(params.ein || "").replace(/\D/g, "").padStart(9, "0").slice(0, 9);
  if (ein.length !== 9 || !admin) return { ok: false, reason: "invalid_ein" };

  const headline = String(params.headline || "Organization update").slice(0, 300);
  const summary = params.summary ? String(params.summary).slice(0, 2000) : null;
  const linkPath = String(params.linkPath || "/trusted").slice(0, 500);
  const sourceType = String(params.sourceType || "manual").slice(0, 64);

  const { error: upErr } = await admin.from(ORG_UPDATES_TABLE).insert({
    ein,
    headline,
    summary,
    link_path: linkPath,
    source_type: sourceType,
  });
  if (upErr) return { ok: false, reason: upErr.message };

  const { data: savers, error: sErr } = await admin.from(SAVED_ORG_TABLE).select("user_id").eq("ein", ein);
  if (sErr || !Array.isArray(savers) || !savers.length) return { ok: true, notified: 0 };

  const table = profileTableName();
  let notified = 0;
  for (const row of savers) {
    const wid = String(row.user_id || "").trim();
    if (!wid) continue;
    const { data: prof } = await admin.from(table).select("id").eq("workos_user_id", wid).maybeSingle();
    if (!prof?.id) continue;
    const r = await createNotificationDeduped(
      admin,
      {
        recipientProfileId: prof.id,
        audienceScope: "user",
        type: "favorite_org_updated",
        title: headline,
        message: summary || `An organization you follow has new information (EIN ${ein.slice(0, 2)}-${ein.slice(2)}).`,
        linkPath,
        entityType: "nonprofit_ein",
        entityId: ein,
        metadata: { ein, source_type: sourceType },
        dedupeHours: 168,
      },
      { windowHours: 168 }
    );
    if (r.ok && !r.skipped) notified += 1;
  }

  return { ok: true, notified };
}

function formatStripeMoney(amountCents, currency) {
  if (amountCents == null || Number.isNaN(Number(amountCents))) return "";
  const n = Number(amountCents) / 100;
  const cur = String(currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

/**
 * Membership billing in-app notices from Stripe invoice webhooks (subscription invoices only).
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {{ id: string }} profileRow
 * @param {Record<string, unknown>} inv Stripe invoice object
 * @param {"invoice.paid" | "invoice.payment_failed" | "invoice.upcoming"} eventType
 */
export async function notifyMembershipFromStripeInvoice(admin, profileRow, inv, eventType) {
  if (!admin || !profileRow?.id || !inv) return { ok: false, reason: "invalid" };
  const recipientProfileId = String(profileRow.id);
  const invId = String(inv.id || "").trim();
  const subRaw = inv.subscription;
  const subId = typeof subRaw === "string" ? subRaw : subRaw?.id ? String(subRaw.id) : "";
  const amount = formatStripeMoney(inv.amount_paid ?? inv.amount_due, inv.currency);
  const line0 = Array.isArray(inv.lines?.data) ? inv.lines.data[0] : null;
  const periodEndSec = line0?.period?.end;
  const periodEnd =
    typeof periodEndSec === "number" ? new Date(periodEndSec * 1000).toLocaleDateString() : null;

  if (eventType === "invoice.paid") {
    if (!invId) return { ok: false, reason: "no_invoice_id" };
    return createNotificationDeduped(
      admin,
      {
        recipientProfileId,
        audienceScope: "user",
        type: "membership_charge_succeeded",
        title: "Membership payment received",
        message: amount
          ? `Your membership payment of ${amount} was processed. Thank you for supporting The Outreach Project.`
          : "Your membership payment was processed. Thank you for supporting The Outreach Project.",
        linkPath: "/profile",
        entityType: "stripe_invoice",
        entityId: invId,
        metadata: { stripe_subscription_id: subId || null, stripe_event: eventType },
        dedupeHours: 720,
      },
      { windowHours: 720 }
    );
  }

  if (eventType === "invoice.payment_failed") {
    if (!invId) return { ok: false, reason: "no_invoice_id" };
    return createNotificationDeduped(
      admin,
      {
        recipientProfileId,
        audienceScope: "user",
        type: "membership_charge_failed",
        title: "Membership payment failed",
        message:
          "We could not process your latest membership charge. Please update your payment method using the billing portal on your profile.",
        linkPath: "/profile",
        entityType: "stripe_invoice",
        entityId: invId,
        metadata: { stripe_subscription_id: subId || null, stripe_event: eventType },
        dedupeHours: 720,
      },
      { windowHours: 720 }
    );
  }

  if (eventType === "invoice.upcoming") {
    const dedupeKey =
      invId ||
      (subId && inv.period_start != null ? `upcoming_${subId}_${inv.period_start}` : `upcoming_${recipientProfileId}`);
    const when =
      periodEnd ||
      (inv.next_payment_attempt ? new Date(inv.next_payment_attempt * 1000).toLocaleDateString() : null);
    return createNotificationDeduped(
      admin,
      {
        recipientProfileId,
        audienceScope: "user",
        type: "membership_charge_upcoming",
        title: "Upcoming membership charge",
        message: when
          ? `Your membership renews soon. The next charge is expected around ${when}.`
          : "Your membership renewal is coming up soon. Review billing on your profile if needed.",
        linkPath: "/profile",
        entityType: "stripe_invoice",
        entityId: dedupeKey,
        metadata: {
          stripe_subscription_id: subId || null,
          stripe_event: eventType,
          amount_due: inv.amount_due ?? null,
          currency: inv.currency || null,
        },
        dedupeHours: 336,
      },
      { windowHours: 336 }
    );
  }

  return { ok: false, reason: "unknown_event" };
}

/** Stub for future Resend/SendGrid — do not block in-app delivery. */
export function scheduleOutboundEmailNotification(_payload) {
  /* extension: queue job, set delivered_email_at when sent */
}
