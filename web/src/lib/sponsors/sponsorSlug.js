/** URL-safe slug from sponsor name. */
export function slugifySponsorName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "sponsor";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} preferred
 */
export async function uniqueSponsorSlug(admin, preferred) {
  let slug = slugifySponsorName(preferred);
  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data } = await admin.from("sponsors_catalog").select("slug").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    attempt += 1;
  }
  return `${slug}-${Date.now()}`;
}
