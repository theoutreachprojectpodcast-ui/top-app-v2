import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { resolveSavedOrganizationDirectoryRows } from "@/lib/savedOrganizations/resolveSavedOrganizations";

export const DEMO_USER_KEY = "top_app_demo_user_id";
const PROFILE_TABLE = process.env.NEXT_PUBLIC_PROFILE_TABLE || "top_app_user_profiles";
const SAVED_EIN_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

function isOptionalCloudError(error) {
  const code = String(error?.code || "");
  if (code === "PGRST205" || code === "42501") return true;
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security") || message.includes("schema cache");
}

export function getOrCreateDemoUserId() {
  if (typeof window === "undefined") return "demo-user";
  try {
    let id = window.localStorage.getItem(DEMO_USER_KEY);
    if (!id) {
      id = `demo-${globalThis.crypto?.randomUUID?.() || String(Date.now())}`;
      window.localStorage.setItem(DEMO_USER_KEY, id);
    }
    return id;
  } catch {
    return "demo-user";
  }
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    membershipStatus: String(row.membership_status ?? "supporter").toLowerCase(),
    banner: row.banner ?? "",
    avatarUrl: row.avatar_url ?? "",
    theme: row.theme ?? "clean",
    savedOrgEins: [],
  };
}

export async function fetchProfileByUserId(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from(PROFILE_TABLE).select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data);
}

export async function upsertProfileByUserId(supabase, userId, profile) {
  if (!supabase || !userId) return;
  const row = {
    user_id: userId,
    first_name: profile.firstName ?? "",
    last_name: profile.lastName ?? "",
    email: profile.email ?? "",
    membership_status: profile.membershipStatus ?? "supporter",
    banner: profile.banner ?? "",
    avatar_url: profile.avatarUrl ?? "",
    theme: profile.theme ?? "clean",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(PROFILE_TABLE).upsert(row, { onConflict: "user_id" });
  if (error && !isOptionalCloudError(error)) throw error;
}

export async function fetchSavedOrgEinList(supabase, userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from(SAVED_EIN_TABLE)
    .select("ein,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return [...new Set(data.map((r) => normalizeEinDigits(r.ein)).filter((e) => e.length === 9))];
}

export async function replaceSavedOrgEinList(supabase, userId, eins) {
  if (!supabase || !userId) return;
  const { error: delErr } = await supabase.from(SAVED_EIN_TABLE).delete().eq("user_id", userId);
  if (delErr && !isOptionalCloudError(delErr)) throw delErr;
  const list = [...new Set((eins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
  if (!list.length) return;
  const rows = list.map((ein, i) => ({
    user_id: userId,
    ein,
    sort_order: i,
  }));
  const { error } = await supabase.from(SAVED_EIN_TABLE).insert(rows);
  if (error && !isOptionalCloudError(error)) throw error;
}

function orderUniqueEins(eins) {
  const seen = new Set();
  const out = [];
  for (const raw of eins || []) {
    const k = normalizeEinDigits(raw);
    if (k.length !== 9 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Returns directory-shaped rows (suitable for mapNonprofitCardRow(..., "saved")), in saved-list order. */
export async function fetchSavedOrganizationsByEin(supabase, eins) {
  if (!supabase || !eins?.length) return [];
  return resolveSavedOrganizationDirectoryRows(supabase, orderUniqueEins(eins));
}
