import { profileTableName } from "@/lib/supabase/admin";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mapCommunityMemberFromProfileRow } from "@/features/community/mappers/mapCommunityMemberFromProfile";

const SAVED_TABLE = process.env.NEXT_PUBLIC_SAVED_ORG_TABLE || "top_app_saved_org_eins";

const MEMBER_SELECT =
  "id, workos_user_id, display_name, first_name, last_name, profile_photo_url, bio, job_title, identity_segment, communities, metadata, user_status, updated_at, created_at";

function escapeIlike(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function metadataMatchesQuery(row, q) {
  const meta = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const haystack = [
    meta.city,
    meta.state,
    meta.identityRole,
    meta.serviceBackground,
    meta.organizationAffiliation,
    meta.causes,
    meta.skills,
  ]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  return haystack.includes(q);
}

async function listSavedOrgEinsForWorkOSUser(admin, workosUserId) {
  if (!admin || !workosUserId) return [];
  const { data, error } = await admin
    .from(SAVED_TABLE)
    .select("ein")
    .eq("user_id", workosUserId)
    .order("sort_order", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return [...new Set(data.map((row) => normalizeEinDigits(row.ein)).filter((ein) => ein.length === 9))];
}

function baseMemberQuery(admin) {
  return admin
    .from(profileTableName())
    .select(MEMBER_SELECT, { count: "exact" })
    .not("workos_user_id", "is", null)
    .neq("workos_user_id", "")
    .or("user_status.eq.active,user_status.is.null");
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ q?: string, limit?: number, profileId?: string }} opts
 */
export async function searchCommunityMembers(admin, { q = "", limit = 24, profileId = "" } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
  const queryText = escapeIlike(q);
  const id = String(profileId || "").trim();

  if (id) {
    const { data, error } = await admin.from(profileTableName()).select(MEMBER_SELECT).eq("id", id).maybeSingle();
    if (error || !data || data.user_status === "suspended" || !data.workos_user_id) {
      return { ok: false, members: [], total: 0, error: error?.message || "not_found" };
    }
    const favoriteEins = await listSavedOrgEinsForWorkOSUser(admin, data.workos_user_id);
    const member = mapCommunityMemberFromProfileRow(data, { favoriteEins });
    return { ok: true, members: member ? [member] : [], total: member ? 1 : 0 };
  }

  let query = baseMemberQuery(admin).order("updated_at", { ascending: false }).limit(safeLimit);

  if (queryText) {
    query = query.or(
      [
        `display_name.ilike.%${queryText}%`,
        `first_name.ilike.%${queryText}%`,
        `last_name.ilike.%${queryText}%`,
        `bio.ilike.%${queryText}%`,
        `job_title.ilike.%${queryText}%`,
        `communities.ilike.%${queryText}%`,
        `identity_segment.ilike.%${queryText}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return { ok: false, members: [], total: 0, error: error.message };
  }

  let rows = Array.isArray(data) ? data : [];
  if (queryText) {
    rows = rows.filter((row) => {
      const dto = mapCommunityMemberFromProfileRow(row);
      const haystack = `${dto?.name || ""} ${dto?.role || ""} ${dto?.tagline || ""} ${dto?.location || ""}`.toLowerCase();
      return haystack.includes(queryText) || metadataMatchesQuery(row, queryText);
    });
  }

  const members = rows.map((row) => mapCommunityMemberFromProfileRow(row)).filter(Boolean);
  return {
    ok: true,
    members,
    total: typeof count === "number" ? count : members.length,
  };
}
