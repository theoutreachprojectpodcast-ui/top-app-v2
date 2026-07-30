/**
 * List active Stripe recurring prices (amounts only — no secrets printed).
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[s.slice(0, i).trim()] = v.replace(/\r\n$/, "");
  }
  return env;
}

const env = loadEnv(path.join(process.cwd(), ".env.vercel.production.pull"));
const key = env.STRIPE_SECRET_KEY?.trim();
if (!key) process.exit(1);

const targets = [0.99, 1, 1.99, 5.99, 99];
const found = [];

for (const limit of [100, 100]) {
  let startingAfter = "";
  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({ limit: String(limit), active: "true" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/prices?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    for (const p of data.data || []) {
      const amount = (p.unit_amount ?? 0) / 100;
      if (!targets.includes(amount)) continue;
      found.push({
        id: p.id,
        amount,
        interval: p.recurring?.interval || "one_time",
        nickname: p.nickname || null,
        product: typeof p.product === "string" ? p.product : p.product?.id,
      });
    }
    if (!data.has_more) break;
    startingAfter = data.data[data.data.length - 1]?.id || "";
    if (!startingAfter) break;
  }
}

found.sort((a, b) => a.amount - b.amount || String(a.interval).localeCompare(String(b.interval)));
for (const row of found) {
  console.log(JSON.stringify(row));
}
