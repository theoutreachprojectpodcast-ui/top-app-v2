/**
 * Run dependency audit via pnpm v11.
 *
 * npm retired the legacy `/security/audits` endpoints (HTTP 410). pnpm 10.x still
 * calls those; pnpm 11+ uses `/security/advisories/bulk`. Keep the repo on pnpm 10
 * for installs, and invoke pnpm 11 only for audit until we upgrade packageManager.
 */
import { spawnSync } from "node:child_process";

const args = [
  "dlx",
  "--config.minimumReleaseAge=0",
  "--config.manage-package-manager-versions=false",
  "--config.pm-on-fail=ignore",
  "pnpm@11.13.1",
  "--pm-on-fail=ignore",
  "audit",
  "--audit-level=high",
  ...process.argv.slice(2),
];

const result = spawnSync("pnpm", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);
