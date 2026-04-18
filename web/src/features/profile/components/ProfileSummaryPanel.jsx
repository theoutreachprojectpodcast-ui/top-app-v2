import Avatar from "@/components/shared/Avatar";
import MembershipBadge from "@/components/shared/MembershipBadge";

export default function ProfileSummaryPanel({
  avatarSrc,
  greetingName,
  isMember,
  membershipLabel,
  membershipHint,
  savedCount,
  icon,
}) {
  return (
    <div className="welcomePanel">
      <Avatar src={avatarSrc || "/assets/top_profile_circle_1024.png"} alt="Profile avatar" />
      <div className="welcomeCopy">
        <p className="introTagline">Welcome back</p>
        <h2>{greetingName}</h2>
        <MembershipBadge isMember={isMember} icon={icon} label={membershipLabel} />
        <p>{membershipHint}</p>
        <p>{savedCount} saved {savedCount === 1 ? "organization" : "organizations"}</p>
      </div>
    </div>
  );
}
