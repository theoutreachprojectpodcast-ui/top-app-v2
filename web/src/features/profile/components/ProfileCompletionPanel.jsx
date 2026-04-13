"use client";

/**
 * Profile tab: completion bar + step list from real profile fields (same model as /api/me profileCompletion).
 */
export default function ProfileCompletionPanel({
  completion,
  onEditProfile,
  onEditProfileFocus,
  onOpenOnboarding,
  onOpenMembership,
}) {
  if (!completion || completion.total < 1) return null;

  const { completed, total, percentage, steps, nextStep, isComplete } = completion;

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
        <h3>Profile completeness</h3>
        <p className="profileCompletionPanel__summary">
          {isComplete ? (
            <>Your profile is complete — thank you for helping the community know you better.</>
          ) : (
            <>
              Your profile is <strong>{percentage}%</strong> complete ({completed} of {total} steps).
            </>
          )}
        </p>
      </div>
      <div className="profileCompletionBar" aria-hidden={isComplete}>
        <div className="profileCompletionBar__track">
          <div className="profileCompletionBar__fill" style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <ol className="profileCompletionTimeline">
        {steps.map((s) => {
          const isNext = !isComplete && nextStep?.id === s.id;
          const actionable =
            !s.done &&
            (s.actionKind === "profile-edit" || s.actionKind === "onboarding" || s.actionKind === "membership");
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
                  <span className="profileCompletionTimeline__nextCue">Suggested next step</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {!isComplete && nextStep ? (
        <div className="row wrap profileCompletionPanel__actions">
          {nextStep.actionKind === "onboarding" ? (
            <button type="button" className="btnPrimary" onClick={() => onOpenOnboarding?.()}>
              Continue account setup
            </button>
          ) : null}
          {nextStep.actionKind === "membership" ? (
            <button type="button" className="btnPrimary" onClick={() => onOpenMembership?.()}>
              Membership &amp; billing
            </button>
          ) : null}
          {nextStep.actionKind === "profile-edit" ? (
            <button
              type="button"
              className="btnSoft"
              onClick={() => {
                if (nextStep.editFocus && onEditProfileFocus) onEditProfileFocus(nextStep.editFocus);
                else onEditProfile?.();
              }}
            >
              Edit profile
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
