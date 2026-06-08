"use client";

import { useRef } from "react";
import AppHeaderBrand from "@/components/layout/AppHeaderBrand";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import HeaderInner from "@/components/layout/HeaderInner";
import SubpageTopbarActions from "@/components/layout/SubpageTopbarActions";
import AdminViewToggle from "@/components/admin/AdminViewToggle";
import AdminPlatformNav from "@/components/admin/AdminPlatformNav";
import { useImmersiveHeaderScroll } from "@/hooks/useImmersiveHeaderScroll";

export default function AdminAppShell({ children, sessionEmail = "" }) {
  const shellRef = useRef(null);
  useImmersiveHeaderScroll({
    rootRef: shellRef,
    enabled: true,
    gradientBoost: true,
  });

  return (
    <main
      ref={shellRef}
      className="topApp appShell appShell--subpage appShell--admin adminConsole header-at-top"
      data-page-atmosphere="admin"
    >
      <div className="topbarOcclusion" aria-hidden="true" />
      <div className="appSiteHeader">
        <AppHeaderBrand homeHref="/admin" ariaLabel="Admin dashboard" />
        <header className="topbar">
          <HeaderInner className="topbarInner">
            <div className="topbarZone topbarLeft">
              <div className="topbarActionsCluster topbarActionsCluster--start">
                <ColorSchemeToggle />
                <AdminViewToggle />
              </div>
            </div>
            <div className="topbarZone topbarCenter" aria-hidden="true" />
            <div className="topbarZone topbarRight">
              <div className="topbarActionsCluster">
                <SubpageTopbarActions section="auth" />
              </div>
            </div>
          </HeaderInner>
        </header>
      </div>

      <div className="adminConsoleChrome">
        <div className="adminConsoleTitleRow">
          <h1>Platform admin</h1>
          {sessionEmail ? (
            <span className="adminMuted" style={{ fontSize: "0.8125rem" }}>
              {sessionEmail}
            </span>
          ) : null}
        </div>
        <AdminPlatformNav />
      </div>

      <section className="shell adminShellBody">{children}</section>
    </main>
  );
}
