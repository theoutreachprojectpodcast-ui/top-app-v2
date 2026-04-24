/**
 * HTTP smoke against a deployed TopApp URL (QA preview, stable QA hostname, etc.).
 *
 * If Vercel **Deployment Protection** is enabled, unauthenticated requests return **401**.
 * Use **Protection Bypass for Automation** (Project → Deployment Protection) and pass the secret:
 *
 *   QA_BASE_URL=https://….vercel.app VERCEL_AUTOMATION_BYPASS_SECRET=… node scripts/qa-http-smoke.mjs
 *
 * @see https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
 */
const baseRaw = process.env.QA_BASE_URL || process.argv[2] || "";
const base = String(baseRaw).replace(/\/$/, "");
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();

if (!base) {
  console.error(
    "[qa-http-smoke] Missing base URL. Usage:\n" +
      "  QA_BASE_URL=https://<host> [VERCEL_AUTOMATION_BYPASS_SECRET=…] node scripts/qa-http-smoke.mjs\n" +
      "  node scripts/qa-http-smoke.mjs https://<host>"
  );
  process.exit(1);
}

const routes = [
  { path: "/", kind: "html" },
  { path: "/contact", kind: "html" },
  { path: "/community", kind: "html" },
  { path: "/api/me", kind: "json" },
  { path: "/api/auth/status", kind: "json" },
];

function headersFor(path) {
  const h = {
    Accept: path.startsWith("/api/") ? "application/json, */*" : "text/html, */*",
  };
  if (bypass) {
    h["x-vercel-protection-bypass"] = bypass;
  }
  return h;
}

async function one(path, kind) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: headersFor(path),
  });
  const text = await res.text();
  let jsonOk = true;
  if (kind === "json" && res.status === 200) {
    try {
      JSON.parse(text);
    } catch {
      jsonOk = false;
    }
  }
  return { path, status: res.status, jsonOk, snippet: text.slice(0, 120) };
}

let failed = false;

for (const { path, kind } of routes) {
  try {
    const r = await one(path, kind);
    if (r.status === 401 && !bypass) {
      console.error(
        `[qa-http-smoke] FAIL ${path} -> ${r.status} (set VERCEL_AUTOMATION_BYPASS_SECRET if Deployment Protection is on)`
      );
      failed = true;
      continue;
    }
    if (r.status === 404) {
      console.error(`[qa-http-smoke] FAIL ${path} -> ${r.status} (wrong host, removed deployment, or domain not attached)`);
      failed = true;
      continue;
    }
    if (r.status < 200 || r.status >= 400) {
      console.error(`[qa-http-smoke] FAIL ${path} -> ${r.status}`);
      failed = true;
      continue;
    }
    if (kind === "json" && !r.jsonOk) {
      console.error(`[qa-http-smoke] FAIL ${path} -> ${r.status} (expected JSON body)`);
      failed = true;
      continue;
    }
    console.log(`[qa-http-smoke] OK ${path} -> ${r.status}`);
  } catch (e) {
    console.error(`[qa-http-smoke] FAIL ${path} -> ${e?.message || e}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log(`[qa-http-smoke] All checks passed for ${base}`);
