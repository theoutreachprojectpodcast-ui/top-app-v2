/**
 * Payment provider integration boundary — previously used for Trusted Resource application fees.
 * Fees are no longer charged; keep this module only if/when a paid product path is reintroduced.
 */

/** @typedef {'idle'|'pending'|'demo_completed'|'provider_ready'|'error'} TrustedResourcePaymentUiState */

/**
 * @param {{ amountUsd: number, currency?: string, applicationDraft: Record<string, unknown> }} ctx
 * @returns {Promise<{ ok: boolean, uiState: TrustedResourcePaymentUiState, clientSecret?: string, providerSessionId?: string, message?: string }>}
 */
export async function startTrustedResourceApplicationPayment(ctx) {
  void ctx;
  return {
    ok: false,
    uiState: "idle",
    message: "Trusted Resource applications do not require a fee.",
  };
}

/**
 * @deprecated Application fees are not required.
 * @param {{ amountUsd: number }} ctx
 */
export async function completeTrustedResourceApplicationFeeDemo(ctx) {
  void ctx;
  return {
    ok: true,
    uiState: "demo_completed",
    application_fee_status: "not_required",
    payment_demo_status: "not_required",
    amountUsd: 0,
  };
}
