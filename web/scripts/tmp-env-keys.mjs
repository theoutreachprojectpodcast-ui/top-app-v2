/**
 * List env keys matching postgres/database/supabase (no values).
 */
for (const k of Object.keys(process.env).sort()) {
  if (/postgres|database|db_|supabase/i.test(k)) console.log(k);
}
