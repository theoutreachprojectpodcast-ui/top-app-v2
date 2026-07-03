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

function resolvePython() {
  const venvCandidates =
    process.platform === "win32"
      ? [path.join(repoRoot, ".venv-icon", "Scripts", "python.exe")]
      : [
          path.join(repoRoot, ".venv-icon", "bin", "python3"),
          path.join(repoRoot, ".venv-icon", "bin", "python"),
        ];

  for (const venvPython of venvCandidates) {
    if (fs.existsSync(venvPython)) return { cmd: venvPython, prefix: [] };
  }

  // Windows: prefer `python` — `python3` often resolves to the Store stub.
  const tries =
    process.platform === "win32"
      ? [
          ["python", []],
          ["py", ["-3"]],
        ]
      : [
          ["python3", []],
          ["python", []],
        ];

  for (const [cmd, prefix] of tries) {
    const probe = spawnSync(cmd, [...prefix, "--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    const out = `${probe.stdout || ""}${probe.stderr || ""}`;
    if (probe.status === 0 && !/was not found/i.test(out)) {
      return { cmd, prefix };
    }
  }

  return null;
}

const python = resolvePython();
if (!python) {
  console.error(
    "[mobile:icons] No Python found. Install Python 3 and Pillow (pip install pillow), or create .venv-icon.",
  );
  process.exit(1);
}

const result = spawnSync(python.cmd, [...python.prefix, script], {
  stdio: "inherit",
  cwd: repoRoot,
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
