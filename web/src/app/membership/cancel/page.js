"use client";

import MobileReturnToAppPanel from "@/components/capacitor/MobileReturnToAppPanel";
import Link from "next/link";

export default function MembershipCancelPage() {
  return (
    <main className="shell legalPageRoute">
      <MobileReturnToAppPanel
        title="Checkout canceled"
        message="No charge was made. You can return to the app or try again on the membership page when you are ready."
      />
      <p className="sponsorSectionLead">
        <Link href="/membership">Back to membership</Link> ·{" "}
        <Link href="/profile">Profile</Link>
      </p>
    </main>
  );
}
