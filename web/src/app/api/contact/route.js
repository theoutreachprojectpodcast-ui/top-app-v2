import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { contactFormSchema } from "@/lib/security/schemas/publicSchemas";
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
  const __guard = guardMutation(request, { rateKey: "public-contact", limit: 12 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ ok: false, error: "server_storage_unavailable" }, { status: 503 });

  const parsed = await parseJsonBody(request, contactFormSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  const body = parsed.data;

  const payload = {
    form_type: "contact",
    status: "new",
    full_name: body.fullName,
    email: body.email,
    phone: body.phone || "",
    subject: body.subject || "",
    message: body.message,
    routing_key: body.routingKey || "default",
    metadata: { userAgent: String(request.headers.get("user-agent") || "").slice(0, 256) },
  };
  const { data, error } = await admin.from(TABLE).insert(payload).select("id").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data?.id || "" });
}
