"use client";

import {
  Activity,
  Compass,
  BookOpen,
  Flame,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Leaf,
  LifeBuoy,
  Megaphone,
  ShieldPlus,
  Sprout,
  Trophy,
  Users,
  Wheat,
} from "lucide-react";

const ICON_BY_CATEGORY = {
  recreationSports: Trophy,
  artsCulture: Wheat,
  publicBenefit: Users,
  religionSpirituality: Sprout,
  healthWellness: HeartPulse,
  education: GraduationCap,
  humanServices: HandHeart,
  veteransMilitary: ShieldPlus,
  firstRespondersSafety: Flame,
  communityDevelopment: Activity,
  environmentAnimals: Leaf,
  youthDevelopment: BookOpen,
  crisisEmergency: LifeBuoy,
  advocacyPolicyRights: Megaphone,
  unknownGeneral: Compass,
};

export default function NonprofitIcon({ category, size = 28, variant = "default" }) {
  const categoryKey = category?.iconType || category?.key || "unknownGeneral";
  const Icon = ICON_BY_CATEGORY[categoryKey] || Compass;
  const iconColor = category?.iconColorVar ? `var(${category.iconColorVar})` : "var(--np-unknownGeneral)";

  return (
    <span
      className={`nonprofitTypeIcon ${variant === "featured" ? "isFeatured" : ""}`}
      aria-hidden="true"
      style={{ "--nonprofit-icon-color": iconColor }}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
