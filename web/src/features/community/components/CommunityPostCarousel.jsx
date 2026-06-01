"use client";

import { useCallback, useState } from "react";
import CommunityPostMedia from "@/features/community/components/CommunityPostMedia";

/**
 * @param {{ slides: Array<{ image?: string, caption?: string, alt?: string }>, ariaLabel?: string }}
 */
export default function CommunityPostCarousel({ slides = [], ariaLabel = "Post image carousel" }) {
  const items = (slides || []).filter((s) => s?.image);
  const [index, setIndex] = useState(0);
  const count = items.length;

  const go = useCallback(
    (delta) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  if (!count) return null;

  const slide = items[index];

  return (
    <div className="communityPostCarousel" role="region" aria-label={ariaLabel}>
      <CommunityPostMedia
        src={slide.image}
        alt={slide.alt || slide.caption || "Carousel slide"}
        className="communityPostMedia--carousel"
        priority={index === 0}
      />
      {slide.caption ? <p className="communityPostCarouselCaption">{slide.caption}</p> : null}
      {count > 1 ? (
        <>
          <div className="communityPostCarouselControls">
            <button type="button" className="communityPostCarouselBtn" onClick={() => go(-1)} aria-label="Previous slide">
              ‹
            </button>
            <button type="button" className="communityPostCarouselBtn" onClick={() => go(1)} aria-label="Next slide">
              ›
            </button>
          </div>
          <div className="communityPostCarouselDots" role="tablist" aria-label="Slide indicators">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1} of ${count}`}
                className={`communityPostCarouselDot${i === index ? " isActive" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
