import { randomUUID } from "crypto";
import { withAuth } from "@workos-inc/authkit-nextjs";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { podcastSponsorCheckoutConfigured } from "@/lib/billing/stripeConfig";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  createPlatformNotification,
  notifyStaffProfiles,
} from "@/server/notifications/notificationService";

const TABLE = "sponsor_applications";

function pickString(obj, key, fallback = "") {
  const v = obj?.[key];
  return v == null ? fallback : String(v).trim();
}

/**
 * Public POST — sponsor applicants may be logged out. Persists via service role.
 */
export async function POST(request) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const first_name = pickString(body, "first_name");
  const last_name = pickString(body, "last_name");
  const email = pickString(body, "email");
  const company_name = pickString(body, "company_name");
  const sponsor_family = pickString(body, "sponsor_family") || "mission_partner";
  const sponsor_program_type = pickString(body, "sponsor_program_type") || "main_app";
  const sponsor_tier_name = pickString(body, "sponsor_tier_name");
  const sponsor_tier_amount = Number(body.sponsor_tier_amount);
  const payment_status_in = pickString(body, "payment_status") || "unpaid";
  const stripe_checkout_session_id_in = pickString(body, "stripe_checkout_session_id");

  if (!first_name || !last_name || !email || !company_name || !sponsor_tier_name || Number.isNaN(sponsor_tier_amount)) {
    return Response.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const auth = await withAuth();

  if (sponsor_program_type === "podcast" && payment_status_in === "paid_stripe") {
    if (!stripe_checkout_session_id_in) {
      return Response.json({ error: "missing_stripe_checkout_session_id" }, { status: 400 });
    }
    if (!auth.user) {
      return Response.json({ error: "unauthorized", message: "Sign in to submit a paid podcast sponsor application." }, { status: 401 });
    }
    if (!podcastSponsorCheckoutConfigured()) {
      return Response.json({ error: "podcast_billing_not_configured" }, { status: 503 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    try {
      const session = await stripe.checkout.sessions.retrieve(stripe_checkout_session_id_in);
      if (session.metadata?.checkout_kind !== "podcast_sponsor") {
        return Response.json({ error: "invalid_checkout_session" }, { status: 400 });
      }
      if (String(session.metadata?.workos_user_id || "") !== auth.user.id) {
        return Response.json({ error: "session_user_mismatch" }, { status: 403 });
      }
      if (session.payment_status !== "paid") {
        return Response.json({ error: "payment_not_completed" }, { status: 400 });
      }
    } catch (e) {
      console.error("[torp] sponsor application stripe verify", e);
      return Response.json({ error: "stripe_verify_failed", message: e.message }, { status: 400 });
    }
  }

  const row = {
    first_name,
    last_name,
    email,
    phone: pickString(body, "phone") || null,
    company_name,
    company_website: pickString(body, "company_website") || null,
    company_type: pickString(body, "company_type") || null,
    city: pickString(body, "city") || null,
    state: pickString(body, "state") || null,
    company_description: pickString(body, "company_description") || null,
    contact_role: pickString(body, "contact_role") || null,
    sponsor_family,
    sponsor_program_type,
    sponsor_tier_id: pickString(body, "sponsor_tier_id") || null,
    sponsor_tier_name,
    sponsor_tier_amount: Math.max(0, Math.round(sponsor_tier_amount)),
    sponsor_interest_notes: pickString(body, "sponsor_interest_notes") || null,
    audience_goals: pickString(body, "audience_goals") || null,
    highlights_requested: pickString(body, "highlights_requested") || null,
    placements_requested: Array.isArray(body.placements_requested) ? body.placements_requested : [],
    activation_requests: pickString(body, "activation_requests") || null,
    assets_ready: pickString(body, "assets_ready") || null,
    brand_links: pickString(body, "brand_links") || null,
    additional_notes: pickString(body, "additional_notes") || null,
    agreed_to_terms: !!body.agreed_to_terms,
    agreed_demo_payment: !!body.agreed_demo_payment,
    payment_status: pickString(body, "payment_status") || "unpaid",
    payment_demo_status: pickString(body, "payment_demo_status") || "unpaid",
    application_status: pickString(body, "application_status") || "submitted",
    stripe_checkout_session_id:
      sponsor_program_type === "podcast" && payment_status_in === "paid_stripe" && stripe_checkout_session_id_in
        ? stripe_checkout_session_id_in
        : null,
    applicant_workos_user_id: auth.user?.id ? String(auth.user.id) : null,
  };

  const { data, error } = await admin.from(TABLE).insert(row).select("id").maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const id = data?.id;
  let inviteQueued = false;
  if (id) {
    const inviteToken = randomUUID();
    const { error: inviteErr } = await admin
      .from(TABLE)
      .update({
        invite_token: inviteToken,
        invite_status: "pending_provider",
      })
      .eq("id", id);
    inviteQueued = !inviteErr;
  }

  if (id) {
    const staffType =
      sponsor_family === "mission_partner" ? "mission_partner_application_submitted" : "sponsor_application_submitted";
    const label = sponsor_program_type === "podcast" ? "Podcast sponsor" : "Mission / sponsor";
    await notifyStaffProfiles(admin, {
      type: staffType,
      title: `${label} application received`,
      message: `${company_name} — ${email} (${sponsor_tier_name}).`,
      linkPath: "/sponsors",
      entityType: "sponsor_application",
      entityId: String(id),
      dedupeHours: 24,
      metadata: { sponsor_family, sponsor_program_type, company_name },
    });

    if (auth.user?.id) {
      const applicantProfile = await getProfileRowByWorkOSId(admin, auth.user.id);
      if (applicantProfile?.id) {
        await createPlatformNotification(admin, {
          recipientProfileId: applicantProfile.id,
          audienceScope: "user",
          type: "application_received",
          title: "We received your application",
          message: `Thanks — the team will review your request for ${company_name}.`,
          linkPath: "/sponsors",
          entityType: "sponsor_application",
          entityId: String(id),
          metadata: { sponsor_family },
        });
      }
    }
  }

  return Response.json({
    ok: true,
    id,
    inviteQueued,
  });
}
