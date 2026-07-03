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
    proOnly: false,
  },
  {
    key: "trusted",
    cardClass: "welcomeActionCard--trusted",
    icon: "trusted",
    title: "Trusted Resources",
    hint: "Real help. Real impact.",
    proOnly: true,
  },
  {
    key: "community",
    cardClass: "welcomeActionCard--community",
    icon: "community",
    title: "Community",
    hint: "Connect. Share. Support each other.",
    proOnly: true,
  },
  {
    key: "podcasts",
    cardClass: "welcomeActionCard--podcasts",
    icon: "podcast",
    title: "Podcasts",
    hint: "Stories that inspire. Voices that matter.",
    proOnly: true,
  },
];

export default function HomeFeatureCards({
  onSponsors,
  onTrusted,
  onCommunity,
  onPodcasts,
  onProUpgrade,
  hasProAccess = true,
}) {
  const handlers = {
    sponsors: onSponsors,
    trusted: onTrusted,
    community: onCommunity,
    podcasts: onPodcasts,
  };

  return (
    <div className="homeFeatureList welcomeActionList" role="navigation" aria-label="Explore The Outreach Project">
      {FEATURES.map((item) => {
        const locked = item.proOnly && !hasProAccess;
        return (
          <button
            key={item.key}
            type="button"
            className={`card action welcomeActionCard welcomeActionCard--uniform ${item.cardClass}${locked ? " welcomeActionCard--locked" : ""}`}
            onClick={() => {
              if (locked) {
                onProUpgrade?.(item.key);
                return;
              }
              handlers[item.key]?.();
            }}
          >
            <AppIcon name={item.icon} size={WELCOME_ACTION_ICON_SIZE} />
            <span className="welcomeActionText">
              <span className="welcomeActionLabel">
                {item.title}
                {locked ? <span className="welcomeActionProBadge">Pro</span> : null}
              </span>
              <span className="welcomeActionHint">
                {locked ? "Upgrade to Pro to unlock this section." : item.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
