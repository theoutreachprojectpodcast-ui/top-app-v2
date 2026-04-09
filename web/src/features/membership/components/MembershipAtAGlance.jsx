"use client";

import { useState } from "react";
import MembershipTierArt from "@/features/membership/components/MembershipTierArt";
import {
  MEMBERSHIP_TIER_DEFINITIONS,
  getMembershipTierDefinition,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

export default function MembershipAtAGlance({
  isAuthenticated,
  currentTierKey,
  onSelectTier,
  onRequestSignIn,
}) {
  const [open, setOpen] = useState(true);
  const current = getMembershipTierDefinition(currentTierKey);
  const tierKey = normalizeMembershipTierKey(currentTierKey);

  return (
    <section className="card membershipAtAGlance">
      <button type="button" className="membershipAtAGlanceHead" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="membershipAtAGlanceHeadMain">
          <span className="membershipAtAGlanceArt" aria-hidden="true">
            <MembershipTierArt tierId={tierKey} />
          </span>
          <div>
          <h3>Membership</h3>
          <p className="membershipAtAGlanceSub">
            {isAuthenticated ? (
              <>
                Current: <strong>{current.label}</strong>
              </>
            ) : (
              <>Choose how you want to participate — sign in to activate saves and profile.</>
            )}
          </p>
          </div>
        </div>
        <span className="membershipAtAGlanceChevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="membershipAtAGlanceBody">
          {!isAuthenticated ? (
            <div className="membershipTierChoiceGrid">
              {MEMBERSHIP_TIER_DEFINITIONS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  className="membershipTierCard"
                  onClick={() => onRequestSignIn?.()}
                >
                  <span className="membershipTierCardTitle">{tier.label}</span>
                  <span className="membershipTierCardHint">{tier.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {isAuthenticated ? (
            <details className="membershipBenefitsDetails" open>
              <summary>Benefits for {current.shortLabel}</summary>
              <ul className="membershipBenefitsList">
                {current.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="membershipTierFootnote">{current.hint}</p>
            </details>
          ) : null}

          {isAuthenticated ? (
            <div className="membershipTierAdminRow">
              <span className="membershipDemoLabel">Demo: switch tier</span>
              <div className="row wrap membershipTierPills">
                {MEMBERSHIP_TIER_DEFINITIONS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    className={`btnSoft membershipTierPill ${normalizeMembershipTierKey(currentTierKey) === tier.id ? "isCurrent" : ""}`}
                    onClick={() => onSelectTier?.(tier.id)}
                  >
                    {tier.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
