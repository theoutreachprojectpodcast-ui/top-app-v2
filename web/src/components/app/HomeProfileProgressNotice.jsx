"use client";

/**
 * Compact home-hero reminder derived from real profile completion (Supabase-backed via /api/me → profile).
 */
export default function HomeProfileProgressNotice({ completion, onOpenProfile, onOpenOnboarding }) {
  if (!completion || completion.isComplete || completion.total < 1) return null;

  const { completed, total, nextStep } = completion;
  const hint =
    nextStep?.id === "onboarding"
      ? "Finish setup to unlock the full account experience."
      : "A few details help the community recognize you.";

  function onContinue() {
    if (nextStep?.actionKind === "onboarding" && onOpenOnboarding) {
      onOpenOnboarding();
      return;
    }
    onOpenProfile?.();
  }

  return (
    <div className="homeProfileProgressNotice" role="status">
      <div className="homeProfileProgressNotice__text">
        <strong className="homeProfileProgressNotice__count">
          {completed} out of {total} steps complete
        </strong>
        <span className="homeProfileProgressNotice__hint">{hint}</span>
      </div>
      <button type="button" className="btnSoft homeProfileProgressNotice__cta" onClick={onContinue}>
        {nextStep?.actionKind === "onboarding" ? "Continue setup" : "Finish profile"}
      </button>
    </div>
  );
}
