/**
 * Payment provider integration boundary — Proven Ally application fee.
 * Replace startProvenAllyApplicationPayment with Stripe (or other) client/server flow when ready.
 */

/** @typedef {'idle'|'pending'|'demo_completed'|'provider_ready'|'error'} ProvenAllyPaymentUiState */

/**
 * @param {{ amountUsd: number, currency?: string, applicationDraft: Record<string, unknown> }} ctx
 * @returns {Promise<{ ok: boolean, uiState: ProvenAllyPaymentUiState, clientSecret?: string, providerSessionId?: string, message?: string }>}
 */
export async function startProvenAllyApplicationPayment(ctx) {
  const amountUsd = Number(ctx?.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, uiState: "error", message: "Invalid payment amount." };
  }

  // FUTURE: create PaymentIntent / Checkout Session on your backend and return clientSecret.
  // const res = await fetch('/api/payments/proven-ally-intent', { method: 'POST', body: JSON.stringify({...}) });
  return {
    ok: true,
    uiState: "provider_ready",
    message:
      "Payment provider not connected. Use demo completion until Stripe (or equivalent) is configured.",
  };
}

/**
 * Demo-only: marks fee satisfied locally until real payments ship.
 * @param {{ amountUsd: number }} ctx
 */
export async function completeProvenAllyApplicationFeeDemo(ctx) {
  return {
    ok: true,
    uiState: "demo_completed",
    application_fee_status: "demo_paid",
    payment_demo_status: "demo_paid",
    amountUsd: ctx.amountUsd,
  };
}
