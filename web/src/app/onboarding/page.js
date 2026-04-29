import { Suspense } from "react";
import { redirect } from "next/navigation";

/** Always read the latest `torp_profiles` row for this session (avoid stale RSC cache emptying onboarding fields). */
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";
import OnboardingFlow from "@/features/onboarding/components/OnboardingFlow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getProfileRowByWorkOSId,
  profileRowToClientDto,
  syncProfileEmailWithWorkOSUser,
} from "@/lib/profile/serverProfile";
import {
  stripeCheckoutConfigured,
  stripeMemberRecurringConfigured,
  stripeSponsorSubscriptionConfigured,
} from "@/lib/billing/stripeConfig";
import { postOnboardingDestination } from "@/lib/account/postOnboardingDestination";

async function OnboardingServer({ searchParams }) {
  const sp = await searchParams;
  /* Do not use withAuth() in this RSC — Next 16 RSC requests often lack x-workos-middleware. */
  const auth = await getWorkOSUserFromCookies();
  if (!auth.user) {
    redirect("/?signin=1");
  }
  if (!sessionMatchesExpectedWorkOSOrganization(auth)) {
    redirect("/?signin=1");
  }
  const admin = createSupabaseAdminClient();
  if (admin) {
    await syncProfileEmailWithWorkOSUser(admin, auth.user);
  }
  const row = admin ? await getProfileRowByWorkOSId(admin, auth.user.id) : null;
  const sessionEmail = String(auth.user.email || "").trim();
  let dto = profileRowToClientDto(row);
  if (dto && sessionEmail && !String(dto.email || "").trim()) {
    dto = { ...dto, email: sessionEmail };
  }
  if (!dto) {
    dto = {
      firstName: auth.user.firstName || "",
      lastName: auth.user.lastName || "",
      email: sessionEmail || "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      membershipTier: "free",
      membershipBillingStatus: "none",
      onboardingCompleted: false,
      platformRole: "user",
      accountIntent: "",
      onboardingStatus: "not_started",
      onboardingCurrentStep: "",
      banner: "",
      theme: "clean",
    };
  }
  if (dto.onboardingCompleted && sp?.checkout !== "success" && sp?.checkout !== "cancel") {
    redirect(
      postOnboardingDestination({
        accountIntent: dto.accountIntent,
        platformRole: dto.platformRole,
        onboardingStatus: dto.onboardingStatus,
        sponsorOnboardingPath: dto.sponsorOnboardingPath,
      }),
    );
  }

  const authBackend = {
    stripe: stripeMemberRecurringConfigured(),
    stripeMemberRecurring: stripeMemberRecurringConfigured(),
    stripeSponsorSubscription: stripeSponsorSubscriptionConfigured(),
    stripeFullOnboarding: stripeCheckoutConfigured(),
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
    <div className="onboardingRouteWrap theme-clean">
      <div className="onboardingRouteToolbar">
        <Link href="/" className="btnSoft">
          ← Back to app
        </Link>
      </div>
      <Suspense fallback={<OnboardingFallback />}>
        <OnboardingServer {...props} />
      </Suspense>
    </div>
  );
}
