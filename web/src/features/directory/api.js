import { PAGE_SIZE } from "@/lib/constants";
import { mapDirectoryRow } from "@/lib/supabase/mappers";
import { queryDirectoryCount, queryDirectoryPage } from "@/lib/supabase/queries";

export async function fetchDirectorySearch(supabase, filters, page = 1) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const pageResult = await queryDirectoryPage(supabase, filters, from, to);
  if (pageResult.error) throw pageResult.error;

  const countResult = await queryDirectoryCount(supabase, filters);
  const count = countResult.error ? null : countResult.count;

  return {
    rows: (pageResult.data || []).map(mapDirectoryRow),
    count: typeof count === "number" ? count : null,
    from,
  };
}
