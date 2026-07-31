import { PAGE_SIZE } from "@/lib/constants";

function applyDirectoryFilters(query, filters, { includePublicStatus = true } = {}) {
  let q = query.eq("state", filters.state);

  // Hide pending_review / hidden / rejected imports from the public directory.
  if (includePublicStatus) {
    q = q.or("directory_status.eq.approved,directory_status.is.null");
  }

  if (filters.q.trim()) {
    const term = filters.q.replace(/,/g, " ").trim();
    q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (filters.service) q = q.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") q = q.eq("serves_veterans", true);
  if (filters.audience === "first_responder") q = q.eq("serves_first_responders", true);
  if (filters.irsSubsection) q = q.eq("irs_subsection", String(filters.irsSubsection));

  return q;
}

function isMissingDirectoryStatusColumn(error) {
  const msg = String(error?.message || "");
  return /directory_status/i.test(msg) && (/does not exist|schema cache|Could not find/i.test(msg));
}

export async function searchDirectory(supabase, filters, nextPage = 1) {
  const from = (nextPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let dataQuery = supabase.from("nonprofits_search_app_v1").select("*");
  dataQuery = applyDirectoryFilters(dataQuery, filters, { includePublicStatus: true }).range(from, to);
  let { data, error } = await dataQuery;
  if (error && isMissingDirectoryStatusColumn(error)) {
    dataQuery = supabase.from("nonprofits_search_app_v1").select("*");
    dataQuery = applyDirectoryFilters(dataQuery, filters, { includePublicStatus: false }).range(from, to);
    ({ data, error } = await dataQuery);
  }
  if (error) throw error;

  let countQuery = supabase.from("nonprofits_search_app_v1").select("*", { count: "exact", head: true });
  countQuery = applyDirectoryFilters(countQuery, filters, { includePublicStatus: true });
  let countResult = await countQuery;
  if (countResult.error && isMissingDirectoryStatusColumn(countResult.error)) {
    countQuery = supabase.from("nonprofits_search_app_v1").select("*", { count: "exact", head: true });
    countQuery = applyDirectoryFilters(countQuery, filters, { includePublicStatus: false });
    countResult = await countQuery;
  }
  const { count } = countResult;

  return {
    rows: data || [],
    count: typeof count === "number" ? count : null,
    from,
  };
}

