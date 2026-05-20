import TrustedResourceDetailPage from "@/features/trusted-resources/components/TrustedResourceDetailPage";
import { getTrustedResourceDetailForSlug } from "@/features/trusted-resources/api/trustedResourceCatalogApi";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";
import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";

function metaDescription(resource) {
  const text = String(
    resource?.heroMission || resource?.shortDescription || resource?.overview || "",
  ).trim();
  if (!text) return "Curated trusted resource profile on The Outreach Project.";
  return text.length > 158 ? `${text.slice(0, 157)}…` : text;
}

export function generateStaticParams() {
  return Object.keys(TRUSTED_RESOURCE_BY_SLUG).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const key = String(slug || "").trim().toLowerCase();
  const registry = TRUSTED_RESOURCE_BY_SLUG[key];
  const supabase = createSupabaseReadClient();
  const resource = await getTrustedResourceDetailForSlug(supabase, key);
  const name =
    resource?.name || registry?.displayName || key.replace(/-/g, " ") || "Trusted Resource";
  return {
    title: `${name} | Trusted Resources`,
    description: metaDescription(resource),
  };
}

export default async function TrustedResourceSlugPage({ params }) {
  const { slug } = await params;
  const key = String(slug || "").trim().toLowerCase();
  const supabase = createSupabaseReadClient();
  const initialResource = await getTrustedResourceDetailForSlug(supabase, key);
  return <TrustedResourceDetailPage slug={key} initialResource={initialResource} />;
}
