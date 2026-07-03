"use client";

import { parseGuidePostBody } from "@/features/community/domain/parseGuidePostBody";
import { isLikelyHtml, sanitizeAdminHtml } from "@/lib/admin/sanitizeHtml";

/**
 * @param {{ body: string, guideDisplay?: 'off' | 'brief' | 'full' }}
 */
export default function CommunityPostBody({ body, guideDisplay = "off" }) {
  const text = String(body || "").trim();
  if (!text) return null;

  if (guideDisplay === "off") {
    if (isLikelyHtml(text)) {
      return (
        <div
          className="communityPostBody communityPostBody--rich"
          dangerouslySetInnerHTML={{ __html: sanitizeAdminHtml(text) }}
        />
      );
    }
    return <p className="communityPostBody">{text}</p>;
  }

  const { intro, steps, why } = parseGuidePostBody(text);

  if (guideDisplay === "brief") {
    const blurb =
      intro ||
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line && !/^step\s+\d+/i.test(line) && !/^why this matters:/i.test(line)) ||
      "";
    if (!blurb && !why) return null;
    return (
      <div className="communityPostBodyGuide communityPostBodyGuide--brief">
        {blurb ? <p className="communityPostBody communityPostBody--brief">{blurb}</p> : null}
        {why ? (
          <p className="communityPostBody communityPostBody--brief communityPostBody--briefWhy">{why}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="communityPostBodyGuide">
      {intro ? <p className="communityPostBodyGuideIntro">{intro}</p> : null}
      {steps.length ? (
        <ol className="communityPostBodyGuideSteps">
          {steps.map((step) => (
            <li key={step.n}>
              <span className="communityPostBodyGuideStepNum">Step {step.n}</span>
              <span className="communityPostBodyGuideStepText">{step.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {why ? (
        <div className="communityPostBodyGuideWhy">
          <p className="communityPostBodyGuideWhyLabel">Why this matters</p>
          <p className="communityPostBodyGuideWhyText">{why}</p>
        </div>
      ) : null}
    </div>
  );
}
