"use client";

/**
 * Profile tab: completion bar + step list from real profile fields (same model as /api/me profileCompletion).
 */
export default function ProfileCompletionPanel({ completion, onEditProfile, onOpenOnboarding }) {
  if (!completion || completion.total < 1) return null;

  const { completed, total, percentage, steps, nextStep, isComplete } = completion;

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
          return (
            <li
              key={s.id}
              className={`profileCompletionTimeline__item ${s.done ? "isDone" : ""} ${isNext ? "isNext" : ""}`}
            >
              <span className="profileCompletionTimeline__mark" aria-hidden="true">
                {s.done ? "✓" : ""}
              </span>
              <div className="profileCompletionTimeline__body">
                <span className="profileCompletionTimeline__label">{s.label}</span>
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
            <button type="button" className="btnPrimary" onClick={onOpenOnboarding}>
              Continue account setup
            </button>
          ) : null}
          {nextStep.actionKind === "profile-edit" ? (
            <button type="button" className="btnSoft" onClick={onEditProfile}>
              Edit profile
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
