"use client";

import IconWrap from "@/components/shared/IconWrap";

const SHIELD_PATH = "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z";

export default function CommunityTrustDisclosure() {
  return (
    <details className="communityTrustDisclosure card communityTrustCard">
      <summary className="communityTrustDisclosureSummary">
        <span className="communityTrustDisclosureIcon" aria-hidden="true">
          <IconWrap path={SHIELD_PATH} />
        </span>
        <span className="communityTrustDisclosureTitle">How we keep this space safe</span>
        <span className="communityTrustDisclosureChevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <ul className="communityTrustList">
        <li>
          <strong>Moderation-first</strong> — individual posts are not public until approved.
        </li>
        <li>
          <strong>Mission-aligned</strong> — we prioritize helpful, respectful, veteran- and first-responder-centered
          stories.
        </li>
        <li>
          <strong>Transparent</strong> — you will always know when content is pending review.
        </li>
      </ul>
    </details>
  );
}
