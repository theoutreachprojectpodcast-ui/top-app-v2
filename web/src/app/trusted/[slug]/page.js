import TrustedResourceDetailPage from "@/features/trusted-resources/components/TrustedResourceDetailPage";
import { getTrustedResourceDetailProfile } from "@/features/trusted-resources/domain/trustedResourceDetailProfiles";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";
import { getTrustedResourceDetailForSlug } from "@/features/trusted-resources/api/trustedResourceCatalogApi";
import { createSupabaseReadClient } from "@/lib/supabase/readServiceClient";
import { redirect } from "next/navigation";

function metaDescription(registry, profile, detail) {
  const text = String(
    detail?.shortDescription ||
      detail?.overview ||
      registry?.shortDescription ||
      profile?.mission ||
      profile?.whoTheyServe ||
      "",
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
  const profile = getTrustedResourceDetailProfile(key);
  let detailName = "";
  try {
    const supabase = createSupabaseReadClient();
    const { detail } = await getTrustedResourceDetailForSlug(supabase, key);
    detailName = detail?.name || "";
  } catch {
    /* metadata fallback */
  }
  const name = detailName || registry?.displayName || key.replace(/-/g, " ") || "Trusted Resource";
  return {
    title: `${name} | Trusted Resources`,
    description: metaDescription(registry, profile, null),
  };
}

export default async function TrustedResourceSlugPage({ params }) {
  const { slug } = await params;
  const key = String(slug || "").trim().toLowerCase();
  const supabase = createSupabaseReadClient();
  let initialDetail = null;
  try {
    const resolved = await getTrustedResourceDetailForSlug(supabase, key);
    if (
      resolved.canonicalSlug &&
      resolved.canonicalSlug !== key &&
      (resolved.redirectedFrom || resolved.detail)
    ) {
      redirect(`/trusted/${resolved.canonicalSlug}`);
    }
    initialDetail = resolved.detail;
  } catch {
    initialDetail = null;
  }
  return <TrustedResourceDetailPage slug={key} initialDetail={initialDetail} />;
}
