"use client";

/**
 * Compact home-hero reminder derived from real profile completion (Supabase-backed via /api/me → profile).
 */
export default function HomeProfileProgressNotice({ completion, onOpenProfile, onOpenOnboarding, onOpenMembership }) {
  if (!completion || completion.isComplete || completion.total < 1) return null;

  const { completed, total, nextStep } = completion;
  const hint =
    nextStep?.actionKind === "onboarding"
      ? "Finish setup to unlock the full account experience."
      : nextStep?.actionKind === "membership"
        ? "Complete billing for the membership path saved on your account."
        : "A few details help the community recognize you — all checklist items are stored on your profile.";

  function onContinue() {
    if (nextStep?.actionKind === "onboarding" && onOpenOnboarding) {
      onOpenOnboarding();
      return;
    }
    if (nextStep?.actionKind === "membership" && onOpenMembership) {
      onOpenMembership();
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
        {nextStep?.actionKind === "onboarding"
          ? "Continue setup"
          : nextStep?.actionKind === "membership"
            ? "Membership"
            : "Finish profile"}
      </button>
    </div>
  );
}
