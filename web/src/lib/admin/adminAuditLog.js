import { requestIp, requestUserAgent } from "@/lib/security/requestGuards";

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  return metadata;
}

export async function writeAdminAuditLog(admin, request, payload) {
  if (!admin) return;
  const row = {
    actor_workos_user_id: String(payload?.actorWorkosUserId || "").trim() || null,
    actor_email: String(payload?.actorEmail || "").trim() || null,
    action: String(payload?.action || "").trim(),
    resource_type: String(payload?.resourceType || "").trim() || null,
    resource_id: String(payload?.resourceId || "").trim() || null,
    metadata: normalizeMetadata(payload?.metadata),
    request_ip: requestIp(request),
    user_agent: requestUserAgent(request),
  };
  if (!row.action) return;
  const { error } = await admin.from("admin_audit_logs").insert(row);
  if (error) {
    console.warn("[admin.audit] insert failed", error.message);
  }
}
