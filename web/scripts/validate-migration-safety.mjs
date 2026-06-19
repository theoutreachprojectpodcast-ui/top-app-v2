/**
 * Database migration safety checklist — static checks before applying migrations in production.
 *
 *   node scripts/validate-migration-safety.mjs path/to/migration.sql
 *   node scripts/validate-migration-safety.mjs supabase/migrations/*.sql
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const files = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!files.length) {
  console.error(
    "[validate-migration-safety] Usage: node scripts/validate-migration-safety.mjs <migration.sql> [more.sql …]",
  );
  process.exit(1);
}

const DESTRUCTIVE = [
  /\bdrop\s+table\b/i,
  /\bdrop\s+column\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\s+public\.torp_profiles\b/i,
  /\bdelete\s+from\s+auth\./i,
];

const RISKY = [
  /\balter\s+table\b.+\bnot\s+null\b/i,
  /\bcreate\s+unique\s+index\b/i,
  /\brename\s+column\b/i,
  /\brename\s+table\b/i,
];

let failed = false;

for (const file of files) {
  const name = basename(file);
  let sql;
  try {
    sql = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`[validate-migration-safety] Cannot read ${file}: ${e.message}`);
    failed = true;
    continue;
  }

  console.log(`[validate-migration-safety] Reviewing ${name}`);

  for (const pattern of DESTRUCTIVE) {
    if (pattern.test(sql)) {
      console.error(`[validate-migration-safety] BLOCK ${name}: destructive pattern ${pattern}`);
      failed = true;
    }
  }

  for (const pattern of RISKY) {
    if (pattern.test(sql)) {
      console.warn(`[validate-migration-safety] WARN ${name}: risky pattern ${pattern} — require QA apply + backup`);
    }
  }

  if (/seed|insert\s+into\s+public\.torp_profiles/i.test(sql) && /production/i.test(name)) {
    console.warn(`[validate-migration-safety] WARN ${name}: seed/insert into profiles — must not overwrite production users`);
  }

  if (!/rollback|revert|downgrade/i.test(sql)) {
    console.warn(`[validate-migration-safety] NOTE ${name}: no rollback notes found — document manual revert steps`);
  }
}

if (failed) {
  console.error("[validate-migration-safety] FAILED — resolve destructive patterns before production apply.");
  process.exit(1);
}

console.log("[validate-migration-safety] Static review passed. Still apply in QA first and take a Supabase backup.");
