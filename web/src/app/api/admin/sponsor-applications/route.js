import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { SPONSOR_REVIEW_STATUSES } from "@/features/sponsors/admin/reviewStatuses";

const TABLE = "sponsor_applications";
const STATUS_SET = new Set(SPONSOR_REVIEW_STATUSES);

function assertModerator(auth) {
  if (!auth.user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const ok = isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id });
  if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const auth = await withAuth();
  const denied = assertModerator(auth);
  if (denied) return denied;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(200);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ records: data || [] });
}

export async function PATCH(request) {
  const auth = await withAuth();
  const denied = assertModerator(auth);
  if (denied) return denied;

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

  const id = String(body.id || "").trim();
  const application_status = String(body.application_status || "").trim();
  const internal_notes = String(body.internal_notes || "").trim();
  if (!id || !STATUS_SET.has(application_status)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await admin
    .from(TABLE)
    .update({
      application_status,
      internal_notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
