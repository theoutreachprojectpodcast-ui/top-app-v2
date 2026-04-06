"use client";

function splitList(s) {
  return String(s || "")
    .split(/[,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ProfileIdentitySection({ profile, onEdit, savedCount = 0 }) {
  const causes = splitList(profile.causes);
  const skills = splitList(profile.skills);
  const volunteer = splitList(profile.volunteerInterests);
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const hasAny =
    profile.identityRole ||
    location ||
    profile.organizationAffiliation ||
    profile.serviceBackground ||
    profile.missionStatement ||
    causes.length ||
    skills.length ||
    volunteer.length ||
    profile.supportInterests ||
    profile.contributionSummary;

  return (
    <div className="card profileIdentityCard">
      <p className="ds-section-label">Identity &amp; contribution</p>
      <h3 className="ds-section-title profileIdentityHeading">How you show up in the network</h3>
      {!hasAny ? (
        <p className="profileIdentityBio">
          Add your role, mission, and focus areas so allies and organizations recognize who you are and how you want to
          help. Use <strong>Edit profile</strong> and the <strong>Identity &amp; contribution</strong> section to update
          these fields. Extended details stay on your device unless you sync to the cloud.
        </p>
      ) : null}

      <div className="profileIdentityGrid">
        {!!profile.identityRole && (
          <div className="profileIdentityField">
            <span className="label">Role</span>
            <span className="value">{profile.identityRole}</span>
          </div>
        )}
        {!!location && (
          <div className="profileIdentityField">
            <span className="label">Location</span>
            <span className="value">{location}</span>
          </div>
        )}
        {!!profile.organizationAffiliation && (
          <div className="profileIdentityField">
            <span className="label">Organization</span>
            <span className="value">{profile.organizationAffiliation}</span>
          </div>
        )}
        {!!profile.serviceBackground && (
          <div className="profileIdentityField">
            <span className="label">Service background</span>
            <span className="value">{profile.serviceBackground}</span>
          </div>
        )}
      </div>

      {!!profile.missionStatement && <p className="profileIdentityBio">{profile.missionStatement}</p>}

      {(causes.length > 0 || skills.length > 0 || volunteer.length > 0) && (
        <div className="ds-chip-row" aria-label="Focus tags">
          {causes.map((t) => (
            <span className="ds-chip ds-chip--gold" key={`c-${t}`}>
              {t}
            </span>
          ))}
          {skills.map((t) => (
            <span className="ds-chip ds-chip--teal" key={`s-${t}`}>
              {t}
            </span>
          ))}
          {volunteer.map((t) => (
            <span className="ds-chip" key={`v-${t}`}>
              {t}
            </span>
          ))}
        </div>
      )}

      {!!profile.supportInterests && (
        <div className="profileIdentityField">
          <span className="label">Support interests</span>
          <span className="value">{profile.supportInterests}</span>
        </div>
      )}

      {!!profile.contributionSummary && (
        <div className="profileIdentityField">
          <span className="label">On-platform contribution</span>
          <span className="value">{profile.contributionSummary}</span>
        </div>
      )}

      <div className="profileIdentityField">
        <span className="label">Engagement</span>
        <span className="value">{savedCount} saved organization{savedCount === 1 ? "" : "s"}</span>
      </div>

      <div className="row wrap">
        <button className="btnSoft" type="button" onClick={onEdit}>
          Edit profile (identity &amp; contribution)
        </button>
      </div>
    </div>
  );
}
