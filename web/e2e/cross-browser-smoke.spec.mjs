import { test, expect } from "@playwright/test";

const expectCommit = String(process.env.TOP_EXPECT_COMMIT || "").trim().toLowerCase();

const CRITICAL_ROUTES = [
  { path: "/", name: "home" },
  { path: "/trusted", name: "trusted" },
  { path: "/community", name: "community" },
  { path: "/profile", name: "profile" },
  { path: "/sign-in", name: "sign-in" },
];

test.describe("cross-browser production smoke", () => {
  test("health exposes public build identity", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ok");
    // Present after the stabilization deploy ships `build` on /api/health.
    if (body.build) {
      expect(body.build).toHaveProperty("environment");
      if (expectCommit && body.build.commitSha) {
        expect(String(body.build.commitSha).toLowerCase()).toBe(expectCommit);
      }
    }
  });

  test("auth status responds", async ({ request }) => {
    const res = await request.get("/api/auth/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("workos");
  });

  for (const route of CRITICAL_ROUTES) {
    test(`loads ${route.name} (${route.path})`, async ({ page }) => {
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(String(err?.message || err)));

      const res = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(res, `navigation to ${route.path}`).toBeTruthy();
      expect(res.status()).toBeLessThan(500);

      await expect(page.locator("body")).toBeVisible();
      // Shell should not be a blank page.
      const text = await page.locator("body").innerText();
      expect(text.trim().length).toBeGreaterThan(0);

      const commitHeader = res.headers()["x-top-commit"];
      if (expectCommit && commitHeader) {
        expect(String(commitHeader).toLowerCase()).toBe(expectCommit);
      }

      const critical = consoleErrors.filter(
        (e) =>
          !/favicon|ResizeObserver|net::ERR_|hydration|third-party|chrome-extension|interactive-widget|Viewport argument key|upgrade-insecure-requests|Content Security Policy/i.test(
            e,
          ),
      );
      expect(critical, `console errors on ${route.path}: ${critical.join(" | ")}`).toEqual([]);
    });
  }

  test("manifest and primary icon load", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const icon = await request.get("/icon-192.png");
    expect(icon.status()).toBe(200);
  });
});
