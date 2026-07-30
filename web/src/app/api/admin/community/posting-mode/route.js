import { requirePlatformAdminMutation, requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import {
  COMMUNITY_POSTING_MODE_OPTIONS,
  normalizeCommunityPostingMode,
  resolveCommunityPostingMode,
  saveCommunityPostingMode,
} from "@/lib/community/communityPostingMode";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const mode = await resolveCommunityPostingMode(ctx.admin);
  return Response.json({
    ok: true,
    mode,
    options: COMMUNITY_POSTING_MODE_OPTIONS,
  });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-community-posting-mode" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const mode = normalizeCommunityPostingMode(body?.mode);
  const previous = await resolveCommunityPostingMode(ctx.admin);
  await saveCommunityPostingMode(ctx.admin, mode, String(ctx.user?.id || ""));

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.community.posting_mode.update",
    resourceType: "admin_settings",
    resourceId: "community_posting_mode",
    metadata: { previous, mode },
  });

  return Response.json({ ok: true, mode, options: COMMUNITY_POSTING_MODE_OPTIONS });
}
