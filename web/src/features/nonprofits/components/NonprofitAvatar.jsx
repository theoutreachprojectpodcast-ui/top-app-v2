"use client";

import { useMemo, useState } from "react";
import NonprofitLocationFallback from "@/features/nonprofits/components/NonprofitLocationFallback";
import { safeUrl } from "@/lib/utils";

export default function NonprofitAvatar({ categoryLabel, logoUrl, cityImageUrl, fallbackLocation = "Unknown Location" }) {
  const [failedLayer, setFailedLayer] = useState("");
  const resolvedLogo = useMemo(() => safeUrl(logoUrl), [logoUrl]);
  const resolvedCityImage = useMemo(() => safeUrl(cityImageUrl), [cityImageUrl]);

  const showLogo = !!resolvedLogo && failedLayer !== "logo";
  const showCity = !showLogo && !!resolvedCityImage && failedLayer !== "city";

  return (
    <div className="nonprofitAvatarWrap" title={categoryLabel || "General Nonprofit"}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedLogo}
          alt={`${categoryLabel || "Nonprofit"} logo`}
          className="nonprofitAvatarImg"
          loading="lazy"
          decoding="async"
          onError={() => setFailedLayer("logo")}
          referrerPolicy="no-referrer"
        />
      ) : showCity ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedCityImage}
          alt={`${fallbackLocation} city`}
          className="nonprofitAvatarImg nonprofitAvatarImg--city"
          loading="lazy"
          decoding="async"
          onError={() => setFailedLayer("city")}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="nonprofitAvatarIconShell">
          <NonprofitLocationFallback text={fallbackLocation || "Unknown Location"} />
        </div>
      )}
    </div>
  );
}
