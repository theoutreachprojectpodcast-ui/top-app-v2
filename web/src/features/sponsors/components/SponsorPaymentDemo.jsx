import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export default function SponsorPaymentDemo({ amount, paymentStatus, onBegin, onComplete, busy }) {
  return (
    <div className="sponsorPaymentCard">
      <h4>Demo Payment Checkout</h4>
      <p>Selected sponsorship total: {formatUsd(amount)}</p>
      <p>
        Payment state:{" "}
        <strong>
          {paymentStatus === "demo_paid"
            ? "demo_paid"
            : paymentStatus === "payment_pending"
              ? "payment_pending"
              : "unpaid"}
        </strong>
      </p>
      <div className="row wrap">
        <button
          className="btnSoft"
          type="button"
          onClick={onBegin}
          disabled={busy || paymentStatus === "payment_pending" || paymentStatus === "demo_paid"}
        >
          {paymentStatus === "payment_pending" ? "Payment Pending..." : "Proceed to Payment"}
        </button>
        <button
          className="btnPrimary"
          type="button"
          onClick={onComplete}
          disabled={busy || paymentStatus !== "payment_pending"}
        >
          Mark Demo Payment Successful
        </button>
      </div>
    </div>
  );
}

