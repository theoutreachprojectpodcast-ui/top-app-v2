import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { notifyStaffProfiles } from "@/server/notifications/notificationService";

export const runtime = "nodejs";

/**
 * Called from the browser after a successful `trusted_resource_applications` insert.
 * Verifies the row server-side, then fans out staff notifications (deduped).
 */
export async function POST(request) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_unavailable" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const applicationId = String(body.applicationId || "").trim();
  if (!applicationId) {
    return Response.json({ error: "applicationId_required" }, { status: 400 });
  }

  const { data: row, error } = await admin
    .from("trusted_resource_applications")
    .select("id, organization_name, applicant_email, applicant_first_name, applicant_last_name, created_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !row?.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const isOwner = String(row.applicant_email || "").trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  const isModerator = isCommunityModeratorServer({
    email: user.email,
    workosUserId: user.id,
    profileRow,
  });
  if (!isOwner && !isModerator) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const createdMs = row.created_at ? new Date(row.created_at).getTime() : 0;
  if (createdMs && Date.now() - createdMs > 6 * 60 * 60 * 1000) {
    return Response.json({ ok: true, skipped: "stale_submission" });
  }

  await notifyStaffProfiles(admin, {
    type: "trusted_resource_application_submitted",
    title: "Trusted Resource application submitted",
    message: `${row.organization_name} — ${row.applicant_first_name} ${row.applicant_last_name} (${row.applicant_email}).`,
    linkPath: "/trusted",
    entityType: "trusted_resource_application",
    entityId: String(row.id),
    dedupeHours: 48,
  });

  return Response.json({ ok: true });
}
