import SponsorProfilePage from "@/features/sponsors/components/SponsorProfilePage";
import { getPublicSponsorCatalogRowBySlug } from "@/features/sponsors/api/sponsorCatalogApi";
import { getSponsorProfileViewModel } from "@/features/sponsors/domain/sponsorViewModels";
import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";

export default async function SponsorSlugPage({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(String(rawSlug || "").trim());
  const supabase = createSupabaseReadClient();
  const row = slug && supabase ? await getPublicSponsorCatalogRowBySlug(supabase, slug) : null;
  const initialProfile = row ? getSponsorProfileViewModel(row) : null;

  return <SponsorProfilePage slug={slug} initialProfile={initialProfile} />;
}
