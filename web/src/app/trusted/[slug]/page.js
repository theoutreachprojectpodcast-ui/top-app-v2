import TrustedResourceDetailPage from "@/features/trusted-resources/components/TrustedResourceDetailPage";
import { getTrustedResourceDetailProfile } from "@/features/trusted-resources/domain/trustedResourceDetailProfiles";
import { TRUSTED_RESOURCE_BY_SLUG } from "@/features/trusted-resources/trustedResourcesRegistry";

function metaDescription(registry, profile) {
  const text = String(
    registry?.shortDescription || profile?.mission || profile?.whoTheyServe || "",
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
  const name = registry?.displayName || key.replace(/-/g, " ") || "Trusted Resource";
  return {
    title: `${name} | Trusted Resources`,
    description: metaDescription(registry, profile),
  };
}

export default async function TrustedResourceSlugPage({ params }) {
  const { slug } = await params;
  const key = String(slug || "").trim().toLowerCase();
  return <TrustedResourceDetailPage slug={key} />;
}
