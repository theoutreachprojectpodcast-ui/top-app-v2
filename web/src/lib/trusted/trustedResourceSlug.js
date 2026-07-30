/** URL-safe kebab slug from a trusted resource display name. */
export function slugifyTrustedResourceName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "trusted-resource";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} preferred
 * @param {{ excludeId?: string }} [opts]
 */
export async function uniqueTrustedResourceSlug(admin, preferred, opts = {}) {
  let slug = slugifyTrustedResourceName(preferred);
  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    let q = admin.from("trusted_resources").select("id").eq("slug", candidate).limit(1);
    if (opts.excludeId) q = q.neq("id", opts.excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    attempt += 1;
  }
  return `${slug}-${Date.now()}`;
}

export function normalizeTrustedSlugParam(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

export function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

export function looksLikeEinDigits(value) {
  const d = String(value || "").replace(/\D/g, "");
  return d.length === 9;
}
