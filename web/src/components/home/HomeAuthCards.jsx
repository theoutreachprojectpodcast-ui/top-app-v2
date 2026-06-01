"use client";

import { ChevronRight, UserPlus, LogIn } from "lucide-react";

export default function HomeAuthCards({ onCreateAccount, onSignIn }) {
  return (
    <div className="homeAuthCards" role="group" aria-label="Account access">
      <button type="button" className="homeAuthCard" onClick={onCreateAccount}>
        <span className="homeAuthCard__icon" aria-hidden="true">
          <UserPlus size={20} strokeWidth={2} />
        </span>
        <span className="homeAuthCard__label">Create Account</span>
        <ChevronRight className="homeAuthCard__chevron" aria-hidden="true" />
      </button>
      <button type="button" className="homeAuthCard" onClick={onSignIn}>
        <span className="homeAuthCard__icon" aria-hidden="true">
          <LogIn size={20} strokeWidth={2} />
        </span>
        <span className="homeAuthCard__label">Sign In</span>
        <ChevronRight className="homeAuthCard__chevron" aria-hidden="true" />
      </button>
    </div>
  );
}
