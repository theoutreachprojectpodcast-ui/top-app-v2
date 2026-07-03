/**
 * User-facing copy when Support members hit Pro-only routes or tabs.
 * @returns {{ title: string, message: string, feature: string }}
 */
export function getProUpgradeGateContent(pathname) {
  const path = String(pathname || "/").trim() || "/";

  if (/^\/community(\/|$)/.test(path)) {
    return {
      title: "Community is a Pro feature",
      message: "Upgrade to Pro to view and participate in community discussions.",
      feature: "Community",
    };
  }
  if (/^\/trusted(\/|$)/.test(path)) {
    return {
      title: "Trusted Resources are a Pro feature",
      message: "Upgrade to Pro to browse trusted partner offers, discounts, and curated resources.",
      feature: "Trusted Resources",
    };
  }
  if (/^\/settings(\/|$)/.test(path)) {
    return {
      title: "Account settings are a Pro feature",
      message: "Upgrade to Pro for full account settings. Support members can still manage membership on Profile.",
      feature: "Settings",
    };
  }
  if (/^\/notifications(\/|$)/.test(path)) {
    return {
      title: "Notifications are a Pro feature",
      message: "Upgrade to Pro to view and manage in-app notifications.",
      feature: "Notifications",
    };
  }
  if (/^\/podcasts\/members(\/|$)/.test(path)) {
    return {
      title: "Pro-exclusive podcast content",
      message: "Upgrade to Pro for bonus episodes and members-only podcast material.",
      feature: "Podcast exclusive content",
    };
  }
  if (/^\/podcasts\/sponsor(\/|$)/.test(path)) {
    return {
      title: "Podcast sponsor opportunities are Pro-only",
      message: "Upgrade to Pro to explore podcast sponsor packages and partnership opportunities.",
      feature: "Podcast sponsors",
    };
  }
  if (/^\/contact(\/|$)/.test(path)) {
    return {
      title: "Contact is a Pro feature",
      message: "Upgrade to Pro to use the in-app contact experience.",
      feature: "Contact",
    };
  }
  if (/^\/onboarding(\/|$)/.test(path)) {
    return {
      title: "Onboarding is a Pro feature",
      message: "Upgrade to Pro to continue with membership onboarding flows.",
      feature: "Onboarding",
    };
  }

  return {
    title: "Upgrade to Pro",
    message: "This area is included with Pro Membership.",
    feature: "",
  };
}

/** @param {string} navKey TopApp dock tab key on `/` */
export function getProUpgradeGateContentForNav(navKey) {
  const key = String(navKey || "").trim().toLowerCase();
  if (key === "community") return getProUpgradeGateContent("/community");
  if (key === "trusted") return getProUpgradeGateContent("/trusted");
  if (key === "settings") return getProUpgradeGateContent("/settings");
  if (key === "contact") return getProUpgradeGateContent("/contact");
  return getProUpgradeGateContent("/");
}
