const CATEGORY = {
  recreationSports: { key: "recreationSports", label: "Recreation & Sports", iconType: "recreationSports", iconColorVar: "--np-recreationSports", tint: "rgba(216, 168, 90, 0.16)" },
  artsCulture: { key: "artsCulture", label: "Arts, Culture & Humanities", iconType: "artsCulture", iconColorVar: "--np-artsCulture", tint: "rgba(215, 139, 106, 0.15)" },
  publicBenefit: { key: "publicBenefit", label: "Public & Societal Benefit", iconType: "publicBenefit", iconColorVar: "--np-publicBenefit", tint: "rgba(159, 177, 209, 0.16)" },
  religionSpirituality: { key: "religionSpirituality", label: "Religion & Spirituality", iconType: "religionSpirituality", iconColorVar: "--np-religionSpirituality", tint: "rgba(177, 147, 214, 0.16)" },
  healthWellness: { key: "healthWellness", label: "Health & Wellness", iconType: "healthWellness", iconColorVar: "--np-healthWellness", tint: "rgba(103, 185, 168, 0.15)" },
  education: { key: "education", label: "Education", iconType: "education", iconColorVar: "--np-education", tint: "rgba(126, 164, 218, 0.16)" },
  humanServices: { key: "humanServices", label: "Human Services", iconType: "humanServices", iconColorVar: "--np-humanServices", tint: "rgba(199, 167, 122, 0.15)" },
  veteransMilitary: { key: "veteransMilitary", label: "Veterans & Military Support", iconType: "veteransMilitary", iconColorVar: "--np-veteransMilitary", tint: "rgba(110, 168, 207, 0.18)" },
  firstRespondersSafety: { key: "firstRespondersSafety", label: "First Responders / Safety", iconType: "firstRespondersSafety", iconColorVar: "--np-firstRespondersSafety", tint: "rgba(213, 123, 98, 0.16)" },
  communityDevelopment: { key: "communityDevelopment", label: "Community Development", iconType: "communityDevelopment", iconColorVar: "--np-communityDevelopment", tint: "rgba(142, 174, 191, 0.15)" },
  environmentAnimals: { key: "environmentAnimals", label: "Environment & Animals", iconType: "environmentAnimals", iconColorVar: "--np-environmentAnimals", tint: "rgba(115, 175, 127, 0.16)" },
  youthDevelopment: { key: "youthDevelopment", label: "Youth Development", iconType: "youthDevelopment", iconColorVar: "--np-youthDevelopment", tint: "rgba(145, 190, 147, 0.16)" },
  crisisEmergency: { key: "crisisEmergency", label: "Crisis Support / Emergency Services", iconType: "crisisEmergency", iconColorVar: "--np-crisisEmergency", tint: "rgba(207, 123, 123, 0.16)" },
  advocacyPolicyRights: { key: "advocacyPolicyRights", label: "Advocacy / Policy / Rights", iconType: "advocacyPolicyRights", iconColorVar: "--np-advocacyPolicyRights", tint: "rgba(198, 141, 201, 0.16)" },
  unknownGeneral: { key: "unknownGeneral", label: "General Nonprofit", iconType: "unknownGeneral", iconColorVar: "--np-unknownGeneral", tint: "rgba(158, 166, 177, 0.15)" },
};

function nteeLetter(code) {
  return String(code || "").trim().toUpperCase().charAt(0);
}

function categoryFromText(row = {}) {
  const text = String(
    row.nonprofit_type ??
    row.nonprofitType ??
    row.orgName ??
    row.raw?.profile?.nonprofit_type ??
    row.raw?.profile?.description ??
    row.raw?.profile?.services_offered ??
    row.raw?.profile?.who_you_serve ??
    row.raw?.profile?.organization_name ??
    ""
  ).toLowerCase();
  if (!text) return null;
  if (text.includes("veteran") || text.includes("military")) return CATEGORY.veteransMilitary;
  if (text.includes("first responder") || text.includes("public safety") || text.includes("fire") || text.includes("police")) return CATEGORY.firstRespondersSafety;
  if (text.includes("health") || text.includes("mental") || text.includes("medical")) return CATEGORY.healthWellness;
  if (text.includes("education") || text.includes("school")) return CATEGORY.education;
  if (text.includes("human service") || text.includes("housing") || text.includes("shelter")) return CATEGORY.humanServices;
  if (text.includes("community")) return CATEGORY.communityDevelopment;
  if (text.includes("environment") || text.includes("animal")) return CATEGORY.environmentAnimals;
  if (text.includes("youth")) return CATEGORY.youthDevelopment;
  if (text.includes("crisis") || text.includes("emergency")) return CATEGORY.crisisEmergency;
  if (text.includes("advocacy") || text.includes("rights") || text.includes("policy")) return CATEGORY.advocacyPolicyRights;
  if (text.includes("religion") || text.includes("faith") || text.includes("spiritual")) return CATEGORY.religionSpirituality;
  if (text.includes("arts") || text.includes("culture") || text.includes("humanities")) return CATEGORY.artsCulture;
  if (text.includes("sports") || text.includes("recreation")) return CATEGORY.recreationSports;
  return null;
}

export function mapNonprofitCategory(row = {}) {
  if (row.provenCategoryKey && CATEGORY[row.provenCategoryKey]) {
    return CATEGORY[row.provenCategoryKey];
  }
  if (row.servesVeterans || row.serves_veterans) return CATEGORY.veteransMilitary;
  if (row.servesFirstResponders || row.serves_first_responders) return CATEGORY.firstRespondersSafety;
  const textMatch = categoryFromText(row);
  if (textMatch) return textMatch;

  switch (nteeLetter(row.nteeCode ?? row.ntee_code ?? row.ntee)) {
    case "N":
      return CATEGORY.recreationSports;
    case "A":
      return CATEGORY.artsCulture;
    case "W":
    case "T":
      return CATEGORY.publicBenefit;
    case "X":
    case "Y":
      return CATEGORY.religionSpirituality;
    case "E":
    case "F":
    case "G":
    case "H":
      return CATEGORY.healthWellness;
    case "B":
      return CATEGORY.education;
    case "P":
    case "L":
      return CATEGORY.humanServices;
    case "M":
      return CATEGORY.firstRespondersSafety;
    case "S":
      return CATEGORY.communityDevelopment;
    case "C":
    case "D":
      return CATEGORY.environmentAnimals;
    case "O": {
      const blob = `${row.nonprofit_type || ""} ${row.orgName || ""} ${row.description || ""}`.toLowerCase();
      if (/veteran|military|warrior|armed\s*forces|service\s*member|troop|combat/.test(blob)) {
        return CATEGORY.veteransMilitary;
      }
      return CATEGORY.youthDevelopment;
    }
    case "Q":
      return CATEGORY.crisisEmergency;
    case "R":
    case "I":
      return CATEGORY.advocacyPolicyRights;
    default:
      return CATEGORY.unknownGeneral;
  }
}

export const NONPROFIT_CATEGORY_MAP = CATEGORY;
