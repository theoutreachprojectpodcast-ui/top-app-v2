import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

const PAGE_IMAGES = "page_images";
const MEDIA_ASSETS = "admin_media_assets";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const [uploads, pageImages] = await Promise.all([
    ctx.admin.from(MEDIA_ASSETS).select("*").order("created_at", { ascending: false }).limit(200),
    ctx.admin.from(PAGE_IMAGES).select("*").order("updated_at", { ascending: false }).limit(200),
  ]);

  if (uploads.error && pageImages.error) {
    return Response.json({ ok: false, error: uploads.error.message || pageImages.error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    uploads: uploads.error ? [] : uploads.data || [],
    pageImages: pageImages.error ? [] : pageImages.data || [],
    uploadsTableReady: !uploads.error,
  });
}
