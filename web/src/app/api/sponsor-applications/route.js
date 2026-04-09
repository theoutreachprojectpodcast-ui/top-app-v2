import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  if (!first_name || !last_name || !email || !company_name || !sponsor_tier_name || Number.isNaN(sponsor_tier_amount)) {
    return Response.json({ error: "missing_required_fields" }, { status: 400 });
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

  return Response.json({
    ok: true,
    id,
    inviteQueued,
  });
}
