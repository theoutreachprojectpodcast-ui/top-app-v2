import { NTEE_MAJOR, STATES } from "@/lib/constants";

export function defaultProfile() {
  return {
    name: "Welcome back.",
    email: "",
    tier: "supporter",
    theme: "clean",
    banner: "",
    photoDataUrl: "",
    badges: { veteran: false, youtube: false },
    identityRole: "",
    missionStatement: "",
    organizationAffiliation: "",
    serviceBackground: "",
    city: "",
    state: "",
    causes: "",
    skills: "",
    volunteerInterests: "",
    supportInterests: "",
    contributionSummary: "",
  };
}

export function safeText(v, fallback = "—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

export function safeUrl(value) {
  if (!value) return null;
  let url = String(value).trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

export function rowName(r) {
  return safeText(
    r?.orgName ??
      r?.org_name ??
      r?.display_name_override ??
      r?.organization_name ??
      r?.legal_name ??
      r?.title ??
      r?.name ??
      r?.NAME ??
      "Unknown Organization"
  );
}
export function rowCity(r) { return safeText(r?.city ?? r?.CITY ?? "", ""); }
export function rowState(r) { return safeText(r?.state ?? r?.STATE ?? "", ""); }
export function rowNtee(r) { return safeText(r?.ntee_code ?? r?.ntee ?? r?.NTEE_CODE ?? "", ""); }
export function rowEin(r) { return String(r?.ein ?? r?.EIN ?? "").trim(); }
export function rowTrusted(r) { return !!(r?.is_trusted ?? r?.trusted ?? false); }

export function nteeToService(nteeCode) {
  const letter = String(nteeCode || "").trim().toUpperCase()[0];
  return NTEE_MAJOR[letter] || "General";
}

export function stateLabel(code) {
  return STATES.find(([k]) => k === code)?.[1] || code;
}
