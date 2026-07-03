import { profileRowToClientDto } from "@/lib/profile/serverProfile";

const IDENTITY_SEGMENT_LABELS = {
  veteran: "Veteran",
  first_responder: "First responder",
  family_member: "Military / service family",
  supporter: "Supporter",
  organization_representative: "Organization representative",
  sponsor: "Sponsor",
  resource_partner: "Resource partner",
};

export function formatCommunityIdentitySegment(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "";
  return IDENTITY_SEGMENT_LABELS[key] || key.replace(/_/g, " ");
}

export function mapCommunityMemberFromProfileRow(row, { favoriteEins = [] } = {}) {
  if (!row || typeof row !== "object") return null;
  const dto = profileRowToClientDto(row);
  const derivedName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim();
  const name = String(dto.displayName || derivedName || "Community member").trim();
  const role =
    String(dto.jobTitle || "").trim() ||
    formatCommunityIdentitySegment(dto.identitySegment) ||
    String(dto.identityRole || "").trim();
  const location = [dto.city, dto.state].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
  const tagline = String(dto.bio || dto.missionStatement || dto.communities || "").trim();

  return {
    id: String(row.id || ""),
    workosUserId: String(row.workos_user_id || ""),
    name,
    role,
    tagline,
    bio: String(dto.bio || "").trim(),
    avatar_url: String(dto.avatarUrl || "").trim(),
    location,
    identitySegment: String(dto.identitySegment || "").trim(),
    favoriteEins: Array.isArray(favoriteEins) ? favoriteEins : [],
  };
}
