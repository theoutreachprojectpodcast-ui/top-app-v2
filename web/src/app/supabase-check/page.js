import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SupabaseCheckPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="content">
        <section className="panel">
          <h1>Supabase Check</h1>
          <p>Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
        </section>
      </main>
    );
  }

  const { data, error, count } = await supabase
    .from("nonprofits_search_app_v1")
    .select("ein,org_name,state", { count: "exact" })
    .limit(5);

  return (
    <main className="content">
      <section className="panel">
        <h1>Supabase Check</h1>
        <p>
          Status: {error ? "Error" : "Connected"} {typeof count === "number" ? `• Total rows: ${count}` : ""}
        </p>
        {error ? (
          <p>{error.message}</p>
        ) : (
          <ul>
            {(data || []).map((row) => (
              <li key={`${row.ein}-${row.org_name}`}>{row.org_name} ({row.state})</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
