import Avatar from "@/components/shared/Avatar";
import MembershipBadge from "@/components/shared/MembershipBadge";

export default function ProfileHeader({ avatarSrc, fullName, email, bio, membershipLabel, isMember, icon, onEdit }) {
  const cleanBio = String(bio || "").trim();
  const showBio = cleanBio && !/^how can we assist you today\??$/i.test(cleanBio);
  return (
    <div className="card cardHero">
      <div className="row space">
        <div className="welcomePanel">
          <Avatar src={avatarSrc} alt="Profile avatar" />
          <div className="welcomeCopy">
            <p className="introTagline">Welcome</p>
            <h2>{fullName || "Supporter"}</h2>
            <MembershipBadge isMember={isMember} icon={icon} label={membershipLabel} />
            <p>{email || "Add your email in Edit Profile to complete your account setup."}</p>
            {showBio ? <p>{cleanBio}</p> : null}
          </div>
        </div>
      </div>
      <div className="row wrap">
        <button className="btnSoft" onClick={onEdit} type="button">Edit Profile</button>
      </div>
    </div>
  );
}
