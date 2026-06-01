import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "api", "admin");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === "route.js") out.push(p);
  }
  return out;
}

const MUTATION = /export async function (POST|PUT|PATCH|DELETE)\s*\(([^)]*)\)/g;

for (const file of walk(root)) {
  let src = fs.readFileSync(file, "utf8");
  if (!MUTATION.test(src)) continue;
  MUTATION.lastIndex = 0;

  if (!src.includes("requirePlatformAdminRouteContext")) continue;

  if (!src.includes("requirePlatformAdminMutation")) {
    src = src.replace(
      'import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";',
      'import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";',
    );
  }

  if (!src.includes("writeAdminAuditLog")) {
    src = src.replace(
      /from "@\/lib\/admin\/adminRouteContext";\n/,
      'from "@/lib/admin/adminRouteContext";\nimport { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";\n',
    );
  }

  const rel = path.relative(path.join(root, "..", "..", ".."), file).replace(/\\/g, "/");
  const baseKey = rel.replace(/^src\/app\/api\//, "").replace(/\/route\.js$/, "").replace(/\//g, "-");

  src = src.replace(MUTATION, (full, method, params) => {
    const hasRequest = /\brequest\b/.test(params);
    const fnParams = hasRequest ? params : params.trim() ? `${params}, request` : "request";
    return `export async function ${method}(${fnParams})`;
  });

  const blocks = src.split(/export async function /);
  const rebuilt = [blocks[0]];
  for (let i = 1; i < blocks.length; i++) {
    let block = blocks[i];
    const method = block.slice(0, block.indexOf("("));
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (isMutation) {
      const rateKey = `admin-${baseKey}-${method.toLowerCase()}`;
      block = block.replace(
        /const ctx = await requirePlatformAdminRouteContext\(\);/,
        `const ctx = await requirePlatformAdminMutation(request, { rateKey: "${rateKey}" });`,
      );
    }
    rebuilt.push(`export async function ${block}`);
  }
  src = rebuilt.join("");

  fs.writeFileSync(file, src, "utf8");
  console.log("patched", file);
}
