function readRole(userOrProfile = null) {
  const role = String(userOrProfile?.platform_role || userOrProfile?.platformRole || "").trim().toLowerCase();
  return role || "guest";
}

function readExplicitPermissions(userOrProfile = null) {
  const raw = userOrProfile?.permissions;
  if (Array.isArray(raw)) return raw.map((p) => String(p || "").trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    return Object.entries(raw)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => String(key || "").trim())
      .filter(Boolean);
  }
  return [];
}

function hasExplicit(userOrProfile, permission) {
  return readExplicitPermissions(userOrProfile).includes(permission);
}

export function canAccessAdmin(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:access");
}

export function canManageUsers(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:users");
}

export function canManageSponsors(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:sponsors");
}

export function canManageResources(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:resources");
}

export function canManageMedia(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:media");
}

export function canPublishContent(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:publish");
}

export function canManagePodcast(userOrProfile = null) {
  const role = readRole(userOrProfile);
  return role === "admin" || hasExplicit(userOrProfile, "admin:podcast");
}

export function canManageCommunity(userOrProfile = null) {
  const role = readRole(userOrProfile);
  if (role === "admin" || role === "moderator") return true;
  return hasExplicit(userOrProfile, "admin:community");
}

