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

for (const file of walk(root)) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("requirePlatformAdminMutation")) continue;
  if (!src.includes("writeAdminAuditLog")) {
    src = src.replace(
      /from "@\/lib\/admin\/adminRouteContext";\n/,
      'from "@/lib/admin/adminRouteContext";\nimport { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";\n',
    );
  }
  if (src.includes("await writeAdminAuditLog(")) continue;

  const rel = path.relative(root, file).replace(/\\/g, "/").replace(/\/route\.js$/, "");
  const action = `admin.${rel.replace(/\//g, ".").replace(/\[|\]/g, "")}`;

  src = src.replace(
    /(export async function (POST|PUT|PATCH|DELETE)[\s\S]*?)(\n  return Response\.json\(\{ ok: true)/,
    `$1\n  await writeAdminAuditLog(ctx.admin, request, {\n    actorWorkosUserId: String(ctx.user?.id || ""),\n    actorEmail: String(ctx.user?.email || ""),\n    action: "${action}.$2",\n    resourceType: "admin_mutation",\n    resourceId: null,\n    metadata: { route: "${rel}" },\n  });$3`,
  );

  if (src.includes("await writeAdminAuditLog(")) {
    fs.writeFileSync(file, src, "utf8");
    console.log("audit", file);
  }
}
