"use client";

import { parseGuidePostBody } from "@/features/community/domain/parseGuidePostBody";

/**
 * @param {{ body: string, isGuide?: boolean }}
 */
export default function CommunityPostBody({ body, isGuide = false }) {
  const text = String(body || "").trim();
  if (!text) return null;

  if (!isGuide) {
    return <p className="communityPostBody">{text}</p>;
  }

  const { intro, steps, why } = parseGuidePostBody(text);

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
