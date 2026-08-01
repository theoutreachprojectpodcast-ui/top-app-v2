import { PAGE_SIZE } from "@/lib/constants";
import { applyDirectoryFilters } from "@/lib/supabase/directoryFilters";
import { queryDirectoryCount, queryDirectoryPage } from "@/lib/supabase/queries";

/**
 * Shared directory search used by non-hook callers.
 * Filters for page + count come from the same applyDirectoryFilters builder.
 */
export async function searchDirectory(supabase, filters, nextPage = 1) {
  const from = (nextPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const pageResult = await queryDirectoryPage(supabase, filters, from, to);
  if (pageResult.error) throw pageResult.error;

  let count = typeof pageResult.count === "number" ? pageResult.count : null;
  if (count === null) {
    const countResult = await queryDirectoryCount(supabase, filters);
    count = typeof countResult.count === "number" ? countResult.count : null;
  }

  return {
    rows: pageResult.data || [],
    count,
    from,
  };
}

// Re-export so callers can share the same filter construction as page/count queries.
export { applyDirectoryFilters };
