"use client";

const STEPS = [
  { key: "apply", title: "Apply", line: "Tell us about your company and goals." },
  { key: "review", title: "Review", line: "We confirm fit and placement options." },
  { key: "confirm", title: "Confirm", line: "Sponsorship level and demo payment step." },
  { key: "assets", title: "Assets", line: "Logos, messaging, and channel guidelines." },
  { key: "launch", title: "Launch", line: "Go live across TOP channels." },
];

function StepIcon({ step }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {step === "apply" && (
          <>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </>
        )}
        {step === "review" && (
          <>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </>
        )}
        {step === "confirm" && (
          <>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </>
        )}
        {step === "assets" && (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </>
        )}
        {step === "launch" && (
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        )}
    </svg>
  );
}

export default function SponsorTimeline() {
  return (
    <section className="card sponsorSection sponsorTimelineSection">
      <h3>How it works</h3>
      <p className="sponsorTimelineLead">From application to activation—clear steps, no guesswork.</p>
      <ol className="sponsorTimeline">
        {STEPS.map((s) => (
          <li key={s.key} className="sponsorTimelineStep">
            <div className="sponsorTimelineIconWrap">
              <StepIcon step={s.key} />
            </div>
            <div className="sponsorTimelineCopy">
              <strong>{s.title}</strong>
              <span>{s.line}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

