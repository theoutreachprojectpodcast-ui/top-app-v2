export const APP_NAME = "The Outreach Project";
export const APP_TAGLINE = "Veteran and First Responder Resource Network";

export const PODCAST_URL = "https://www.youtube.com/@TheOutreachProjectHq";

export const PAGE_SIZE = 100;
export const TRUSTED_PAGE_SIZE = 30;
export const DEMO_MODE = true;

export const FAV_KEY = "top_favorites_v3";
export const PROFILE_KEY = "top_profile_v3";
export const AUTH_KEY = "top_auth_v1";
/** Demo-only local credential store (not secure; replace with real auth). */
export const DEMO_ACCOUNT_KEY = "top_demo_account_v1";

export const STATES = [
  ["", "Select a state..."],
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
];

export const NTEE_MAJOR = {
  A: "Arts, Culture & Humanities",
  B: "Education",
  C: "Environment",
  D: "Animal-Related",
  E: "Health Care",
  F: "Mental Health & Crisis",
  G: "Disease & Disorders",
  H: "Medical Research",
  I: "Crime & Legal",
  J: "Employment",
  K: "Food, Agriculture & Nutrition",
  L: "Housing & Shelter",
  M: "Public Safety & Disaster",
  N: "Recreation & Sports",
  O: "Youth Development",
  P: "Human Services",
  Q: "International",
  R: "Civil Rights & Advocacy",
  S: "Community Improvement",
  T: "Mutual & Membership Benefit",
  U: "Science & Technology",
  V: "Social Science",
  W: "Public & Societal Benefit",
  X: "Religion-Related",
  Y: "Mutual/Membership (Other)",
  Z: "Unknown/Other",
};

export const SERVICE_OPTIONS = [
  ["", "All service areas"],
  ...Object.keys(NTEE_MAJOR)
    .sort()
    .map((k) => [k, NTEE_MAJOR[k]]),
];
