import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { sendInvoiceEmail } from "@/server/admin/sendInvoiceEmail";
import { parseJsonBody, validationFailureResponse } from "@/lib/security/secureRoute";
import { adminInvoiceSchema } from "@/lib/security/schemas/adminSchemas";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";

export const runtime = "nodejs";
const TABLE = "billing_records";

function parseAmountCents(rawAmount) {
  const normalized = Number.parseFloat(String(rawAmount || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.round(normalized * 100);
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const { data, error } = await ctx.admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-billing-post" });
  if (!ctx.ok) return ctx.response;
  const parsed = await parseJsonBody(request, adminInvoiceSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  const body = parsed.data;

  const workosUserId = body.workosUserId;
  const recipientEmail = body.recipientEmail;
  const recipientName = body.recipientName || "";
  const reason = body.reason;
  const paymentUrl = body.paymentUrl;
  const notes = body.notes || "";
  const amountCents = parseAmountCents(body.amount);
  if (amountCents <= 0) {
    return Response.json({ ok: false, error: "invalid_amount" }, { status: 400 });
  }

  const amountDisplay = `$${(amountCents / 100).toFixed(2)}`;
  const send = await sendInvoiceEmail({
    to: recipientEmail,
    recipientName,
    amountDisplay,
    reason,
    paymentUrl,
    notes,
  });

  const payload = {
    workos_user_id: workosUserId,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    amount_cents: amountCents,
    currency: "USD",
    reason,
    payment_url: paymentUrl,
    notes,
    status: send.ok ? "sent" : "failed",
    provider: "resend",
    provider_message_id: send.ok ? send.id : null,
    provider_error: send.ok ? null : send.error,
    sent_at: send.ok ? new Date().toISOString() : null,
    created_by: ctx.user.id,
  };

  const { data, error } = await ctx.admin.from(TABLE).insert(payload).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!send.ok) {
    return Response.json(
      { ok: false, error: send.error, message: "Invoice record saved but email provider is not configured or send failed.", row: data },
      { status: 503 },
    );
  }
  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.billing.POST",
    resourceType: "admin_mutation",
    resourceId: null,
    metadata: { route: "billing" },
  });
  return Response.json({ ok: true, row: data });
}
