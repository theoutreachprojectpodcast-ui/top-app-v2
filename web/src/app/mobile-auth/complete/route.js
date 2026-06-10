import { NextResponse } from "next/server";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { createMobileSessionTransferToken } from "@/lib/auth/mobileSessionTransfer";
import { buildMobileAuthCompleteDeepLink } from "@/lib/capacitor/mobileDeepLinks";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";

export const dynamic = "force-dynamic";

/**
 * Browser-only bridge after mobile WorkOS auth: seal session → deep link back into Capacitor app.
 */
export async function GET(request) {
  const { user } = await getWorkOSUserFromCookies();
  const returnTo = resolvePostAuthReturnTarget(
    request.nextUrl.searchParams.get("returnTo"),
    "/",
  );

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("mobile", "1");
    login.searchParams.set("returnTo", typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/");
    return NextResponse.redirect(login);
  }

  const token = await createMobileSessionTransferToken(
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/",
  );
  if (!token) {
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Sign-in incomplete</title></head><body><p>Could not prepare your mobile session. Close this window and try signing in again from the app.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const deepLink = buildMobileAuthCompleteDeepLink(
    token,
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/",
  );
  const safeLink = deepLink.replace(/"/g, "&quot;");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${safeLink}" />
  <title>Returning to The Outreach Project…</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:system-ui,sans-serif;
      background:#121212; color:#e8eef6; padding:1.5rem; text-align:center; }
    .spinner { width:44px; height:44px; border:3px solid rgba(34,165,43,.25); border-top-color:#22a52b;
      border-radius:50%; animation:spin .85s linear infinite; margin:0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color:#55d85c; }
  </style>
</head>
<body>
  <div>
    <div class="spinner" aria-hidden="true"></div>
    <p>Returning to The Outreach Project app…</p>
    <p><a href="${safeLink}">Tap here if the app does not open</a></p>
  </div>
  <script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
