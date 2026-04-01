"use client";

import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";

export default function NonprofitAvatar({ category, tier, categoryLabel }) {
  return (
    <div className="nonprofitAvatarWrap" title={categoryLabel || "General Nonprofit"}>
      <div className="nonprofitAvatarIconShell">
        <NonprofitIcon category={category} variant={tier} />
      </div>
    </div>
  );
}
