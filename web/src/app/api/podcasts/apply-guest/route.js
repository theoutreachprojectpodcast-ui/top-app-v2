import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminSetting } from "@/lib/admin/adminSettings";
import { sendPodcastGuestApplicationNotify } from "@/server/podcasts/sendPodcastGuestApplicationNotify";

export const runtime = "nodejs";

function pickString(v, max = 8000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const full_name = pickString(body.full_name, 240);
  const email = pickString(body.email, 320);
  const organization = pickString(body.organization, 400);
  const website_url = pickString(body.website_url, 800);
  const topic_pitch = pickString(body.topic_pitch, 4000);
  const why_now = pickString(body.why_now, 2000);
  const social_links = pickString(body.social_links, 2000);
  const phone = pickString(body.phone, 80);
  const role_title = pickString(body.role_title, 240);
  const message = pickString(body.message, 8000);

  if (!full_name || !email || !topic_pitch) {
    return Response.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }

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
    const contact = await getAdminSetting(admin, "contact.form", {});
    const recipient = String(contact?.recipientEmail || "").trim();
    if (recipient) {
      const bodyText = [
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
        message ? `\nMessage:\n${message}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const sent = await sendPodcastGuestApplicationNotify({
        to: recipient,
        applicantName: full_name,
        applicantEmail: email,
        topic: topic_pitch.slice(0, 200),
        bodyText,
      });
      if (!sent.ok) emailWarning = `Saved, but email was not sent (${sent.error}).`;
    } else {
      emailWarning = "Saved. Configure Admin → Contact primary recipient email to receive notifications.";
    }
  } catch (e) {
    emailWarning = `Saved, but notification step failed (${String(e?.message || e)}).`;
  }

  return Response.json({ ok: true, id: insertedId, emailWarning });
}
