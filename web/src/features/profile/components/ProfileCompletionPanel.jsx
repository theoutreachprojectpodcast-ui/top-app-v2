"use client";

/**
 * Profile tab: completion from real persisted fields (see profileCompletenessModel).
 * Hidden when required + recommended account fields are satisfied (membership may still be pending elsewhere).
 */
export default function ProfileCompletionPanel({
  completion,
  profile,
  onEditProfile,
  onEditProfileFocus,
  onOpenOnboarding,
  onOpenMembership,
}) {
  if (!completion || completion.hidePanel) return null;

  const { account, panelSteps, panelPercentage, panelCompleted, panelTotal, showEnhancementOnly } = completion;
  const isAccountIncomplete = !account?.requiredAllMet;

  function activateStep(s) {
    if (s.done) return;
    if (s.actionKind === "onboarding") {
      onOpenOnboarding?.();
      return;
    }
    if (s.actionKind === "membership") {
      onOpenMembership?.();
      return;
    }
    if (s.actionKind === "profile-edit") {
      if (s.editFocus && onEditProfileFocus) onEditProfileFocus(s.editFocus);
      else onEditProfile?.();
      return;
    }
    onEditProfile?.();
  }

  return (
    <div className="card profileCompletionPanel">
      <div className="profileCompletionPanel__head">
        <h3>{showEnhancementOnly ? "Profile enhancement" : "Profile completeness"}</h3>
        <p className="profileCompletionPanel__summary">
          {showEnhancementOnly ? (
            <>
              Required details are saved. Your profile is <strong>{panelPercentage}%</strong> complete — optional items help
              the community support you better.
            </>
          ) : (
            <>
              Your profile is <strong>{panelPercentage}%</strong> complete ({panelCompleted} of {panelTotal} items).
            </>
          )}
        </p>
        {profile?.onboardingSkipped && isAccountIncomplete ? (
          <p className="profilePhotoUploadHint" style={{ marginTop: 8 }}>
            You skipped the full setup wizard. Use <strong>Complete account setup</strong> to finish, or complete items below.
          </p>
        ) : null}
      </div>
      <div className="profileCompletionBar" aria-hidden={panelSteps.length === 0}>
        <div className="profileCompletionBar__track">
          <div className="profileCompletionBar__fill" style={{ width: `${panelPercentage}%` }} />
        </div>
      </div>
      <ol className="profileCompletionTimeline">
        {panelSteps.map((s, idx) => {
          const isNext = idx === 0;
          const actionable = !s.done && s.actionKind === "profile-edit";
          return (
            <li
              key={s.id}
              className={`profileCompletionTimeline__item ${s.done ? "isDone" : ""} ${isNext ? "isNext" : ""} ${actionable ? "isActionable" : ""}`}
            >
              <span className="profileCompletionTimeline__mark" aria-hidden="true">
                {s.done ? "✓" : ""}
              </span>
              <div className="profileCompletionTimeline__body">
                {actionable ? (
                  <button type="button" className="profileCompletionTimeline__stepBtn" onClick={() => activateStep(s)}>
                    <span className="profileCompletionTimeline__label">{s.label}</span>
                  </button>
                ) : (
                  <span className="profileCompletionTimeline__label">{s.label}</span>
                )}
                {!s.done && isNext ? (
                  <span className="profileCompletionTimeline__nextCue">
                    {s.tier === "recommended" ? "Suggested enhancement" : "Next step"}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="row wrap profileCompletionPanel__actions">
        {isAccountIncomplete ? (
          <button type="button" className="btnPrimary" onClick={() => onOpenOnboarding?.()}>
            Complete account setup
          </button>
        ) : null}
        {panelSteps[0]?.actionKind === "profile-edit" ? (
          <button
            type="button"
            className="btnSoft"
            onClick={() => {
              const f = panelSteps[0]?.editFocus;
              if (f && onEditProfileFocus) onEditProfileFocus(f);
              else onEditProfile?.();
            }}
          >
            Edit profile
          </button>
        ) : null}
      </div>
    </div>
  );
}
