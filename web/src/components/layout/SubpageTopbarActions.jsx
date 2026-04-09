"use client";

import Link from "next/link";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import IconWrap from "@/components/shared/IconWrap";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

export default function SubpageTopbarActions({ showThemeToggle = true }) {
  return (
    <div className="topbarActionsCluster">
      {showThemeToggle ? <ColorSchemeToggle /> : null}
      <Link className="btnSoft sponsorBtn" href="/">
        <IconWrap path={SPONSOR_ICON} />
        Become a Sponsor
      </Link>
    </div>
  );
}
