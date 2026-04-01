import {
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  HandHelping,
  Landmark,
  Dumbbell,
  Palette,
  Leaf,
  Users,
  Flame,
  Megaphone,
  Church,
  Compass,
  Handshake,
  Siren,
} from "lucide-react";

const ICON_BY_CATEGORY = {
  recreationSports: Dumbbell,
  artsCulture: Palette,
  publicBenefit: Landmark,
  religionSpirituality: Church,
  healthWellness: HeartPulse,
  education: GraduationCap,
  humanServices: HandHelping,
  veteransMilitary: ShieldCheck,
  firstRespondersSafety: Siren,
  communityDevelopment: Handshake,
  environmentAnimals: Leaf,
  youthDevelopment: Users,
  crisisEmergency: Flame,
  advocacyPolicyRights: Megaphone,
  unknownGeneral: Compass,
};

export default function NonprofitIcon({ category, size = 28, variant = "default" }) {
  const Icon = ICON_BY_CATEGORY[category] || ICON_BY_CATEGORY.unknownGeneral;
  return (
    <span className={`nonprofitTypeIcon ${variant === "featured" ? "isFeatured" : ""}`} aria-hidden="true">
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
