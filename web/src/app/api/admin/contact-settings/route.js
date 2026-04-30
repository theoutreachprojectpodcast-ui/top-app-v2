import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { getAdminSetting, upsertAdminSetting } from "@/lib/admin/adminSettings";

export const runtime = "nodejs";

const CONTACT_KEY = "contact.form";
const DEFAULT_SETTINGS = {
  recipientEmail: "",
  ccEmail: "",
  bccEmail: "",
  successMessage: "Thanks for reaching out. We will get back to you shortly.",
  routing: { default: "" },
};

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  try {
    const settings = await getAdminSetting(ctx.admin, CONTACT_KEY, DEFAULT_SETTINGS);
    return Response.json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...settings } });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "settings_read_failed" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const recipientEmail = String(body?.recipientEmail || "").trim();
  const ccEmail = String(body?.ccEmail || "").trim();
  const bccEmail = String(body?.bccEmail || "").trim();
  const successMessage = String(body?.successMessage || DEFAULT_SETTINGS.successMessage).trim();
  const routing = body?.routing && typeof body.routing === "object" ? body.routing : { default: "" };
  const nextSettings = { recipientEmail, ccEmail, bccEmail, successMessage, routing };
  try {
    await upsertAdminSetting(ctx.admin, CONTACT_KEY, nextSettings, ctx.user.id);
    return Response.json({ ok: true, settings: nextSettings });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "settings_write_failed" }, { status: 500 });
  }
}
