const CATEGORY = {
  recreationSports: { key: "recreationSports", label: "Recreation & Sports" },
  artsCulture: { key: "artsCulture", label: "Arts, Culture & Humanities" },
  publicBenefit: { key: "publicBenefit", label: "Public & Societal Benefit" },
  religionSpirituality: { key: "religionSpirituality", label: "Religion & Spirituality" },
  healthWellness: { key: "healthWellness", label: "Health & Wellness" },
  education: { key: "education", label: "Education" },
  humanServices: { key: "humanServices", label: "Human Services" },
  veteransMilitary: { key: "veteransMilitary", label: "Veterans & Military Support" },
  firstRespondersSafety: { key: "firstRespondersSafety", label: "First Responders / Safety" },
  communityDevelopment: { key: "communityDevelopment", label: "Community Development" },
  environmentAnimals: { key: "environmentAnimals", label: "Environment & Animals" },
  youthDevelopment: { key: "youthDevelopment", label: "Youth Development" },
  crisisEmergency: { key: "crisisEmergency", label: "Crisis Support / Emergency Services" },
  advocacyPolicyRights: { key: "advocacyPolicyRights", label: "Advocacy / Policy / Rights" },
  unknownGeneral: { key: "unknownGeneral", label: "General Nonprofit" },
};

function nteeLetter(code) {
  return String(code || "").trim().toUpperCase().charAt(0);
}

export function mapNonprofitCategory(row = {}) {
  if (row.servesVeterans || row.serves_veterans) return CATEGORY.veteransMilitary;
  if (row.servesFirstResponders || row.serves_first_responders) return CATEGORY.firstRespondersSafety;

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
    case "O":
      return CATEGORY.youthDevelopment;
    case "Q":
      return CATEGORY.crisisEmergency;
    case "R":
    case "I":
      return CATEGORY.advocacyPolicyRights;
    default:
      return CATEGORY.unknownGeneral;
  }
}
