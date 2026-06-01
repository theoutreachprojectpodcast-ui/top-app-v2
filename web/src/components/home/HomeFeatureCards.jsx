"use client";

import AppIcon from "@/components/shared/AppIcon";

const WELCOME_ACTION_ICON_SIZE = 42;

const FEATURES = [
  {
    key: "sponsors",
    cardClass: "welcomeActionCard--sponsors",
    icon: "sponsors",
    title: "Sponsors",
    hint: "Partner page — open packages from there",
  },
  {
    key: "trusted",
    cardClass: "welcomeActionCard--trusted",
    icon: "trusted",
    title: "Trusted Resources",
    hint: "Real help. Real impact.",
  },
  {
    key: "community",
    cardClass: "welcomeActionCard--community",
    icon: "community",
    title: "Community",
    hint: "Connect. Share. Support each other.",
  },
  {
    key: "podcasts",
    cardClass: "welcomeActionCard--podcasts",
    icon: "podcast",
    title: "Podcasts",
    hint: "Stories that inspire. Voices that matter.",
  },
];

export default function HomeFeatureCards({ onSponsors, onTrusted, onCommunity, onPodcasts }) {
  const handlers = {
    sponsors: onSponsors,
    trusted: onTrusted,
    community: onCommunity,
    podcasts: onPodcasts,
  };

  return (
    <div className="homeFeatureList welcomeActionList" role="navigation" aria-label="Explore The Outreach Project">
      {FEATURES.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`card action welcomeActionCard welcomeActionCard--uniform ${item.cardClass}`}
          onClick={handlers[item.key]}
        >
          <AppIcon name={item.icon} size={WELCOME_ACTION_ICON_SIZE} />
          <span className="welcomeActionText">
            <span className="welcomeActionLabel">{item.title}</span>
            <span className="welcomeActionHint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
