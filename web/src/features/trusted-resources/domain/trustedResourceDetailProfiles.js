/**
 * Curated detail-page copy and outbound URLs per Trusted Resource slug.
 * Sourced from official sites/socials; omit fields when unknown.
 *
 * @typedef {object} TrustedResourceDetailProfile
 * @property {string} [mission]
 * @property {string} [whoTheyServe]
 * @property {string[]} [services]
 * @property {string} [whyItMatters]
 * @property {string} [serviceArea]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {{ type: string, label?: string, description?: string, url: string }[]} [resourceLinks]
 */

/** @type {Record<string, TrustedResourceDetailProfile>} */
export const TRUSTED_RESOURCE_DETAIL_BY_SLUG = {
  "say-when-and-remember-him": {
    mission:
      "Honor Seth M. Plant and raise awareness of veteran suicide while funding trade-school scholarships and community remembrance events.",
    whoTheyServe: "Veterans, families, and community members connected to veteran suicide prevention and memorial efforts.",
    services: [
      "Trade-school scholarship fundraising",
      "Community remembrance and awareness events",
      "Memorial storytelling and peer connection",
    ],
    whyItMatters:
      "Memorial-driven nonprofits help families channel grief into tangible support for the next generation of veterans entering skilled trades.",
    serviceArea: "St. Augustine, FL and surrounding communities",
    resourceLinks: [{ type: "events", url: "https://saywhenandrememberhim.org/", label: "Events & news" }],
  },
  "back-country-heroes": {
    mission:
      "Provide outdoor sporting opportunities that build camaraderie, independence, and mental and physical healing for veterans, first responders, and their families.",
    whoTheyServe: "Veterans, first responders, and family members seeking peer connection through outdoor adventure.",
    services: [
      "Guided outdoor sporting experiences",
      "Peer mentorship in the field",
      "Family-inclusive adventure opportunities",
    ],
    whyItMatters:
      "Structured outdoor recreation gives service members a practical way to rebuild confidence and community after high-stress careers.",
    serviceArea: "National (program locations vary)",
    resourceLinks: [{ type: "volunteer", url: "https://www.backcountryheroes.org/", label: "Get involved" }],
  },
  "hero-to-the-line": {
    mission:
      "Place and support Labrador service and working dogs with veterans, active-duty members, and Gold Star families through training and community events.",
    whoTheyServe: "Veterans, active-duty service members, and Gold Star families.",
    services: [
      "Service and working dog placement",
      "Handler training and follow-up support",
      "Community events that connect families and peers",
    ],
    whyItMatters:
      "Task-trained dogs can restore independence and daily stability for members navigating physical or invisible wounds.",
    serviceArea: "Huntsville, TX and partner communities",
    resourceLinks: [{ type: "intake", url: "https://hero2theline.org/", label: "Learn about programs" }],
  },
  "heros-journey-healing-foundation": {
    mission:
      "Deliver therapeutic adventures and community-based healing experiences for veterans, first responders, healthcare professionals, and spouses at no cost.",
    whoTheyServe:
      "Veterans, first responders, healthcare workers, and spouses seeking restorative outdoor and community-based healing.",
    services: [
      "Therapeutic adventure retreats",
      "Community healing gatherings",
      "Peer support in nature-based settings",
    ],
    whyItMatters:
      "Adventure-based healing helps participants reset outside clinical settings while staying connected to others who understand service stress.",
    serviceArea: "National",
    resourceLinks: [{ type: "intake", url: "https://www.herosjourneyheals.org/", label: "Programs & contact" }],
  },
  "freedom-alliance": {
    mission:
      "Support wounded service members and military families through care packages, scholarships, morale programs, and community engagement.",
    whoTheyServe: "Wounded warriors, active-duty families, and military-connected students.",
    services: [
      "Scholarships for military children and spouses",
      "Care packages and morale support",
      "Community and partner engagement programs",
    ],
    whyItMatters:
      "Long-term family support keeps military households stable while service members recover or transition.",
    serviceArea: "National",
    resourceLinks: [
      { type: "donate", url: "https://www.freedomalliance.org/donate/" },
      { type: "volunteer", url: "https://www.freedomalliance.org/get-involved/" },
    ],
  },
  "southern-outdoor-dreams": {
    mission:
      "Provide faith-centered outdoor adventures and community for veterans, youth, and people facing physical health challenges.",
    whoTheyServe: "Veterans, youth, and individuals navigating significant health challenges.",
    services: [
      "Outdoor adventure outings",
      "Faith-centered community gatherings",
      "Youth and veteran mentorship in the field",
    ],
    whyItMatters:
      "Outdoor programs create neutral ground where participants can decompress, connect, and rediscover purpose.",
    serviceArea: "Texas and partner regions",
    resourceLinks: [{ type: "donate", url: "https://www.southernoutdoordreams.org/donate" }],
  },
  "frontline-healing-foundation": {
    mission:
      "Remove financial barriers to critical care for active-duty military, veterans, and first responders, including treatment for PTS, addiction, and TBI.",
    whoTheyServe: "Active-duty military, veterans, and first responders seeking behavioral health and recovery care.",
    services: [
      "Financial assistance for treatment access",
      "Navigation support for PTS, TBI, and addiction care",
      "Partnerships with treatment providers",
    ],
    whyItMatters:
      "When cost blocks care, members delay treatment—targeted aid can shorten crises and keep families intact.",
    serviceArea: "Bandera, TX and national partner network",
    resourceLinks: [{ type: "intake", url: "https://frontlinehealingfoundation.org/", label: "Request support" }],
  },
  "hometown-hero-outdoors": {
    mission:
      "Deliver peer-led outdoor experiences that promote connection, resilience, and healing for veterans and first responders.",
    whoTheyServe: "Veterans and first responders nationwide.",
    services: [
      "Peer-led outdoor trips and retreats",
      "Chapter-based community events",
      "Mentorship among service members",
    ],
    whyItMatters:
      "Peer-led models reduce stigma because participants learn from others who have worn the same uniform.",
    serviceArea: "National (chapter network)",
    resourceLinks: [
      { type: "volunteer", url: "https://www.hometownherooutdoors.org/volunteer" },
      { type: "events", url: "https://www.hometownherooutdoors.org/events" },
    ],
  },
  "veterans-creed-outdoors": {
    mission:
      "Connect veterans and first responders with hunting, fishing, and outdoor adventures through volunteer-led state chapters.",
    whoTheyServe: "Veterans and first responders across participating states.",
    services: [
      "Hunting and fishing adventure trips",
      "State chapter events and mentorship",
      "Volunteer trip coordination",
    ],
    whyItMatters:
      "Chapter-based outdoor networks scale access so members can find local peers without traveling far from home.",
    serviceArea: "Multi-state U.S. (see vcousa.org chapters)",
    resourceLinks: [{ type: "intake", url: "https://www.vcousa.org/", label: "Find a chapter" }],
  },
  "warriors-refuge": {
    mission:
      "Provide transitional housing, counseling, and employment support for veterans experiencing homelessness or crisis.",
    whoTheyServe: "Veterans facing homelessness, crisis, or transition instability.",
    services: [
      "Transitional housing",
      "Counseling and case management",
      "Employment and stability planning",
    ],
    whyItMatters:
      "Stable housing plus wraparound services is often the difference between a short crisis and chronic homelessness.",
    serviceArea: "West Columbia, TX",
    resourceLinks: [{ type: "intake", url: "https://thewarriorsrefuge.us/", label: "Get help" }],
  },
  "hoof-to-heart-veterans": {
    mission:
      "Offer equine-facilitated learning and groundwork programs for veterans and first responders at no cost.",
    whoTheyServe: "Veterans and first responders in the Northeast.",
    services: [
      "Equine-facilitated learning sessions",
      "Groundwork and horsemanship programs",
      "Small-group veteran wellness classes",
    ],
    whyItMatters:
      "Working with horses builds calm, focus, and trust—skills that translate directly to civilian life and relationships.",
    serviceArea: "Southwick, MA",
    resourceLinks: [{ type: "intake", url: "https://hooftoheartvets.com/", label: "Program information" }],
  },
  "mos-veteran-adventures": {
    mission:
      "Organize outdoor adventures and support services for disabled veterans, including recreation and rehabilitation navigation.",
    whoTheyServe: "Disabled veterans and their supporters in Arizona and partner regions.",
    services: [
      "Outdoor adventure outings",
      "Rehabilitation and benefits navigation",
      "Community events for disabled veterans",
    ],
    whyItMatters:
      "Combining recreation with navigation helps members stay active while solving practical barriers to care and benefits.",
    serviceArea: "Glendale, AZ",
    resourceLinks: [{ type: "donate", url: "https://mosveteranadventures.com/donate" }],
  },
  "the-fallen-outdoors": {
    mission:
      "Coordinate volunteer-led outdoor adventures for veterans, active-duty members, and Gold Star families at no cost nationwide.",
    whoTheyServe: "Veterans, active-duty members, and Gold Star families.",
    services: [
      "National outdoor adventure calendar",
      "Volunteer trip leaders and mentors",
      "Gold Star family-inclusive outings",
    ],
    whyItMatters:
      "No-cost adventures remove a common barrier so members can participate without worrying about gear or fees.",
    serviceArea: "National",
    resourceLinks: [
      { type: "intake", url: "https://thefallenoutdoors.org/trip-application/", label: "Trip application" },
      { type: "volunteer", url: "https://thefallenoutdoors.org/volunteer/" },
    ],
  },
  "sheepdog-impact-assistance": {
    mission:
      "Engage veterans and first responders through outdoor adventures, resilience programming, and disaster response volunteer missions.",
    whoTheyServe: "Veterans, first responders, and communities affected by disaster.",
    services: [
      "Outdoor adventure and resilience events",
      "Disaster response volunteer deployments",
      "Peer community for “Sheepdogs” still serving in spirit",
    ],
    whyItMatters:
      "Purpose-driven volunteer work helps members channel training and teamwork into missions that matter at home.",
    serviceArea: "Rogers, AR and national teams",
    resourceLinks: [
      { type: "volunteer", url: "https://sheepdogia.org/get-involved/" },
      { type: "events", url: "https://sheepdogia.org/events/" },
    ],
  },
};

/**
 * @param {string} slug
 * @returns {TrustedResourceDetailProfile | null}
 */
export function getTrustedResourceDetailProfile(slug) {
  const key = String(slug || "").trim().toLowerCase();
  return TRUSTED_RESOURCE_DETAIL_BY_SLUG[key] || null;
}
