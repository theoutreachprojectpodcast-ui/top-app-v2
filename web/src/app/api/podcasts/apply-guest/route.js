import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { guestApplicationSchema } from "@/lib/security/schemas/publicSchemas";
import { resolveApplicationNotifyRecipients } from "@/lib/platform/applicationNotifyRecipients";
import { sendPodcastGuestApplicationNotify } from "@/server/podcasts/sendPodcastGuestApplicationNotify";

export const runtime = "nodejs";

function pickString(v, max = 8000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "public-guest-app", limit: 8 });
  if (!guard.ok) return guardFailureResponse(guard);

  const parsed = await parseJsonBody(request, guestApplicationSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  const body = parsed.data;

  const full_name = body.full_name;
  const email = body.email;
  const organization = pickString(body.organization, 400);
  const website_url = pickString(body.website_url, 800);
  const topic_pitch = body.topic_pitch;
  const why_now = pickString(body.why_now, 2000);
  const social_links = pickString(body.social_links, 2000);
  const phone = pickString(body.phone, 80);
  const role_title = pickString(body.role_title, 240);
  const message = pickString(body.message, 8000);
  const community_context = pickString(body.community_context, 4000);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  const record = {
    full_name,
    email,
    organization: organization || null,
    website_url: website_url || null,
    topic_pitch,
    why_now: why_now || null,
    social_links: social_links || null,
    proposed_topic: topic_pitch,
    why_you_should_be_on: why_now || null,
    audience_value: social_links || null,
    social_url: website_url || null,
    phone: phone || null,
    role_title: role_title || null,
    message: message || null,
    status: "submitted",
  };

  let insertedId = null;
  const { error: insertErr, data: inserted } = await admin
    .from("podcast_guest_applications")
    .insert(record)
    .select("id")
    .maybeSingle();

  if (!insertErr) {
    insertedId = inserted?.id || null;
  } else {
    const legacy = { ...record };
    delete legacy.phone;
    delete legacy.role_title;
    delete legacy.message;
    const { error: legacyErr, data: legacyRow } = await admin
      .from("podcast_guest_applications")
      .insert(legacy)
      .select("id")
      .maybeSingle();
    if (legacyErr) {
      return Response.json({ ok: false, error: insertErr.message || legacyErr.message }, { status: 500 });
    }
    insertedId = legacyRow?.id || null;
  }

  let emailWarning = "";
  try {
    const recipients = resolveApplicationNotifyRecipients();
    const envHint = String(process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "unknown").trim();
    const bodyText = [
      `Application ID: ${insertedId || "(unknown)"}`,
      `Environment: ${envHint}`,
      `Submitted at: ${new Date().toISOString()}`,
      `Status: submitted`,
      phone ? `Phone: ${phone}` : "",
      organization ? `Organization: ${organization}` : "",
      role_title ? `Role / title: ${role_title}` : "",
      website_url ? `Website: ${website_url}` : "",
      "",
      "Topic pitch:",
      topic_pitch,
      "",
      why_now ? `Why now:\n${why_now}` : "",
      social_links ? `Social / links:\n${social_links}` : "",
      community_context ? `Veteran / first responder / community relevance:\n${community_context}` : "",
      message ? `\nApplicant message:\n${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendPodcastGuestApplicationNotify({
      to: recipients,
      applicantName: full_name,
      applicantEmail: email,
      topic: topic_pitch.slice(0, 200),
      bodyText,
    });
    if (!sent.ok) emailWarning = `Saved, but email was not sent (${sent.error}).`;
    else if (process.env.NODE_ENV === "development") {
      console.info("[podcast-apply-guest] notify sent", { to: recipients, id: insertedId });
    }
  } catch (e) {
    emailWarning = `Saved, but notification step failed (${String(e?.message || e)}).`;
  }

  if (process.env.NODE_ENV === "development" && emailWarning) {
    console.warn("[podcast-apply-guest]", emailWarning);
  }

  return Response.json({ ok: true, id: insertedId, emailWarning });
}
