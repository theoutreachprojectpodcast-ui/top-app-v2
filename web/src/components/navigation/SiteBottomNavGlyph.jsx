"use client";

import {
  HeartHandshake,
  Home,
  Mail,
  Podcast,
  Shield,
  UserRound,
  UsersRound,
} from "lucide-react";

const GLYPHS = {
  home: Home,
  trusted: Shield,
  community: UsersRound,
  sponsors: HeartHandshake,
  profile: UserRound,
  podcast: Podcast,
  contact: Mail,
};

/**
 * Lucide glyph for the site dock / bottom nav (shared main app + AppShell).
 * Stroke weight tuned for small sizes beside labels.
 */
export default function SiteBottomNavGlyph({ navKey, className = "", size = 20 }) {
  const Icon = GLYPHS[navKey] || Home;
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden="true" focusable={false} />;
}
