import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = fs.readdirSync(root).filter((f) => f.startsWith(".env"));
for (const f of files) {
  const text = fs.readFileSync(path.join(root, f), "utf8");
  const secret = text.match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
  const portal = text.match(/^STRIPE_BILLING_PORTAL_CONFIGURATION=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
  const prefix = secret ? secret.slice(0, 7) : "";
  console.log(`${f}: secret=${prefix || "missing"} portal=${portal ? portal.slice(0, 12) + "..." : "missing"}`);
}
