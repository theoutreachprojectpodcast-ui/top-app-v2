import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminSetting } from "@/lib/admin/adminSettings";

export const runtime = "nodejs";
const TABLE = "form_submissions";
const CONTACT_KEY = "contact.form";

export async function GET() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({
      ok: true,
      settings: { successMessage: "Thanks for reaching out. We will get back to you shortly." },
    });
  }
  try {
    const settings = await getAdminSetting(admin, CONTACT_KEY, { successMessage: "Thanks for reaching out. We will get back to you shortly." });
    return Response.json({ ok: true, settings });
  } catch {
    return Response.json({ ok: true, settings: { successMessage: "Thanks for reaching out. We will get back to you shortly." } });
  }
}

export async function POST(request) {
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ ok: false, error: "server_storage_unavailable" }, { status: 503 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const payload = {
    form_type: "contact",
    status: "new",
    full_name: String(body?.fullName || "").trim(),
    email: String(body?.email || "").trim(),
    phone: String(body?.phone || "").trim(),
    subject: String(body?.subject || "").trim(),
    message: String(body?.message || "").trim(),
    routing_key: String(body?.routingKey || "default").trim(),
    metadata: { userAgent: String(request.headers.get("user-agent") || "").slice(0, 256) },
  };
  if (!payload.full_name || !payload.email || !payload.message) {
    return Response.json({ ok: false, error: "name_email_message_required" }, { status: 400 });
  }
  const { data, error } = await admin.from(TABLE).insert(payload).select("id").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data?.id || "" });
}
