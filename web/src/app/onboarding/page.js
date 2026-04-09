import { Suspense } from "react";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import OnboardingFlow from "@/features/onboarding/components/OnboardingFlow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import { stripeCheckoutConfigured } from "@/lib/billing/stripeConfig";

async function OnboardingServer({ searchParams }) {
  const sp = await searchParams;
  const auth = await withAuth();
  if (!auth.user) {
    redirect("/?signin=1");
  }
  const admin = createSupabaseAdminClient();
  const row = admin ? await getProfileRowByWorkOSId(admin, auth.user.id) : null;
  let dto = profileRowToClientDto(row);
  if (!dto) {
    dto = {
      firstName: auth.user.firstName || "",
      lastName: auth.user.lastName || "",
      email: auth.user.email || "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      membershipTier: "free",
      membershipBillingStatus: "none",
      onboardingCompleted: false,
      banner: "",
      theme: "clean",
    };
  }
  if (dto.onboardingCompleted && sp?.checkout !== "success" && sp?.checkout !== "cancel") {
    redirect("/");
  }

  const authBackend = {
    stripe: stripeCheckoutConfigured(),
  };

  return <OnboardingFlow initialProfile={dto} authBackend={authBackend} />;
}

function OnboardingFallback() {
  return (
    <div className="shell">
      <section className="card">
        <p className="sponsorSectionLead">Loading onboarding…</p>
      </section>
    </div>
  );
}

export default function OnboardingPage(props) {
  return (
    <main className="topApp theme-clean">
      <div className="headerBrandStack" style={{ padding: "16px 20px" }}>
        <Link href="/" className="btnSoft">
          ← Back to app
        </Link>
      </div>
      <Suspense fallback={<OnboardingFallback />}>
        <OnboardingServer {...props} />
      </Suspense>
    </main>
  );
}
