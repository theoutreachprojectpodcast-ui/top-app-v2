import { PAGE_SIZE } from "@/lib/constants";

function applyDirectoryFilters(query, filters) {
  let q = query.eq("state", filters.state);

  if (filters.q.trim()) {
    const term = filters.q.replace(/,/g, " ").trim();
    q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (filters.service) q = q.ilike("ntee_code", `${filters.service}%`);
  if (filters.audience === "veteran") q = q.eq("serves_veterans", true);
  if (filters.audience === "first_responder") q = q.eq("serves_first_responders", true);

  return q;
}

export async function searchDirectory(supabase, filters, nextPage = 1) {
  const from = (nextPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let dataQuery = supabase.from("nonprofits_search_app_v1").select("*");
  dataQuery = applyDirectoryFilters(dataQuery, filters).range(from, to);
  const { data, error } = await dataQuery;
  if (error) throw error;

  let countQuery = supabase.from("nonprofits_search_app_v1").select("*", { count: "exact", head: true });
  countQuery = applyDirectoryFilters(countQuery, filters);
  const { count } = await countQuery;

  return {
    rows: data || [],
    count: typeof count === "number" ? count : null,
    from,
  };
}

