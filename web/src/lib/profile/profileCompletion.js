import { evaluateAccountProfileCompleteness, evaluateFullProfileCompletion } from "@/lib/profile/profileCompletenessModel";

export { mergeProfileWithWorkOSUserForCompleteness as mergeProfileWithWorkOSUser } from "@/lib/profile/profileCompletenessModel";

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
export function computeProfileCompletion(profile, options = {}) {
  const full = evaluateFullProfileCompletion(profile, options);
  const { account } = full;

  const panelIncomplete = [...account.requiredItems, ...account.recommendedItems].filter((s) => !s.done);

  const panelSteps = panelIncomplete.map((s) => ({
    id: s.id,
    label: s.label,
    shortLabel: s.label,
    done: s.done,
    actionKind: s.actionKind || "profile-edit",
    editFocus: s.editFocus ?? null,
    tier: s.tier,
  }));

  const panelCompleted = account.allItems.filter((s) => s.done).length;
  const panelTotal = account.allItems.length;
  const panelPercentage = account.percentage;
  const panelNext = panelSteps[0] || null;

  return {
    steps: full.steps,
    completed: full.completed,
    total: full.total,
    percentage: full.percentage,
    nextStep: full.nextStep,
    isComplete: full.isComplete,
    account,
    hidePanel: account.fullyComplete,
    showEnhancementOnly: account.requiredAllMet && !account.fullyComplete,
    panelSteps,
    panelCompleted,
    panelTotal,
    panelPercentage,
    panelNext,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
export function getIncompleteEditFocusIds(profile, options = {}) {
  const account = evaluateAccountProfileCompleteness(profile, options);
  if (!account?.requiredItems || !account?.recommendedItems) return new Set();
  return new Set(
    [...account.requiredItems, ...account.recommendedItems]
      .filter((s) => !s.done && s.editFocus)
      .map((s) => s.editFocus),
  );
}
