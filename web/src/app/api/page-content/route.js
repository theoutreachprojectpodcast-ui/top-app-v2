import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadPublicPageContentBlocks } from "@/lib/content/publicPageContentBlocks";

export const runtime = "nodejs";

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const pageKey = String(searchParams.get("pageKey") || searchParams.get("page_key") || "").trim();
  const sectionKey = String(searchParams.get("sectionKey") || searchParams.get("section_key") || "").trim();

  if (!admin) {
    return Response.json({ ok: true, rows: [], warning: "storage_unavailable" });
  }

  try {
    const rows = await loadPublicPageContentBlocks(admin, { pageKey, sectionKey });
    return Response.json(
      { ok: true, rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err), rows: [] }, { status: 500 });
  }
}
