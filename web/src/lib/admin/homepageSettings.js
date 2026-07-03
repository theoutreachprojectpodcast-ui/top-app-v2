const SETTING_KEY = "homepage.sponsors";

const DEFAULTS = Object.freeze({
  carouselLimit: 3,
  carouselIntervalMs: 3000,
});

export function normalizeHomepageSponsorSettings(raw) {
  const v = raw && typeof raw === "object" ? raw : {};
  const carouselLimit = Math.min(Math.max(parseInt(String(v.carouselLimit ?? DEFAULTS.carouselLimit), 10) || DEFAULTS.carouselLimit, 1), 12);
  const carouselIntervalMs = Math.min(
    Math.max(parseInt(String(v.carouselIntervalMs ?? DEFAULTS.carouselIntervalMs), 10) || DEFAULTS.carouselIntervalMs, 2000),
    15000,
  );
  return { carouselLimit, carouselIntervalMs };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
export async function readHomepageSponsorSettings(admin) {
  if (!admin) return { ...DEFAULTS };
  const { data } = await admin.from("admin_settings").select("setting_value").eq("setting_key", SETTING_KEY).maybeSingle();
  return normalizeHomepageSponsorSettings(data?.setting_value);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {{ carouselLimit?: number, carouselIntervalMs?: number }} patch
 */
export async function writeHomepageSponsorSettings(admin, patch) {
  const next = normalizeHomepageSponsorSettings({ ...(await readHomepageSponsorSettings(admin)), ...patch });
  const { error } = await admin.from("admin_settings").upsert(
    {
      setting_key: SETTING_KEY,
      setting_value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );
  if (error) throw error;
  return next;
}

export { SETTING_KEY, DEFAULTS };
