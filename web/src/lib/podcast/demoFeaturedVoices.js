/**
 * In-memory demo “Voices” cards for localhost when `podcast_guests` has no active rows.
 * Never used in production (`NODE_ENV === "production"` is excluded at call site).
 */
export function getDemoFeaturedVoicesForLanding() {
  return [
    {
      id: "demo-voice-1",
      slug: "demo-voice-1",
      name: "Alex Rivera",
      title: "Army veteran · nonprofit founder",
      bio: "",
      quote: "Service doesn’t end when you take off the uniform — it changes shape.",
      avatar_url: "",
      upcoming: false,
      unverified: true,
      discussionSummary: "",
      episodeYoutubeId: "",
      episodeWatchUrl: "",
    },
    {
      id: "demo-voice-2",
      slug: "demo-voice-2",
      name: "Jordan Lee",
      title: "First responder · peer support lead",
      bio: "",
      quote: "We built this network so no one has to white-knuckle the hard days alone.",
      avatar_url: "",
      upcoming: false,
      unverified: true,
      discussionSummary: "",
      episodeYoutubeId: "",
      episodeWatchUrl: "",
    },
    {
      id: "demo-voice-3",
      slug: "demo-voice-3",
      name: "Sam Ortiz",
      title: "Community advocate",
      bio: "",
      quote: "Clarity under pressure is a skill — and it’s one we can teach each other.",
      avatar_url: "",
      upcoming: false,
      unverified: true,
      discussionSummary: "",
      episodeYoutubeId: "",
      episodeWatchUrl: "",
    },
  ];
}
