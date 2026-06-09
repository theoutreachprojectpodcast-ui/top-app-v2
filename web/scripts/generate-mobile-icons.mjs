/**
 * Regenerate iOS / Android / PWA icons from brand assets.
 * Uses repo-root .venv-icon when present (pip install pillow).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(webRoot, "..");
const script = path.join(webRoot, "scripts", "generate-mobile-app-icons.py");
const venvPython = path.join(repoRoot, ".venv-icon", "bin", "python3");
const python = fs.existsSync(venvPython) ? venvPython : "python3";

const result = spawnSync(python, [script], { stdio: "inherit", cwd: repoRoot });
process.exit(result.status ?? 1);
