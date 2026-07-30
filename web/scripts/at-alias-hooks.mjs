import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const SRC_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function resolveAtPath(specifier) {
  const rel = specifier.slice(2);
  const candidates = [
    path.join(SRC_ROOT, rel),
    path.join(SRC_ROOT, `${rel}.js`),
    path.join(SRC_ROOT, `${rel}.jsx`),
    path.join(SRC_ROOT, rel, "index.js"),
  ];
  for (const abs of candidates) {
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return pathToFileURL(abs).href;
    }
  }
  return pathToFileURL(path.join(SRC_ROOT, `${rel}.js`)).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(resolveAtPath(specifier), context);
  }
  // Next-style extensionless relative imports inside src/
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    context.parentURL.includes("/src/")
  ) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const absBase = path.resolve(parentDir, specifier);
      for (const abs of [`${absBase}.js`, `${absBase}.jsx`, path.join(absBase, "index.js")]) {
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
          return nextResolve(pathToFileURL(abs).href, context);
        }
      }
      throw err;
    }
  }
  return nextResolve(specifier, context);
}
