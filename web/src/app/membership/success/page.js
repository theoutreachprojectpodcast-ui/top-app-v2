"use client";

import MobileReturnToAppPanel from "@/components/capacitor/MobileReturnToAppPanel";
import Link from "next/link";

export default function MembershipSuccessPage() {
  return (
    <main className="shell legalPageRoute">
      <MobileReturnToAppPanel
        title="Membership updated"
        message="If you completed signup or checkout, your account and membership are saved on the TOP website. Return to the mobile app to continue."
        showSignInHint
      />
      <p className="sponsorSectionLead">
        <Link href="/profile?mobileReturn=account">Go to profile</Link> ·{" "}
        <Link href="/membership">Membership</Link>
      </p>
    </main>
  );
}
