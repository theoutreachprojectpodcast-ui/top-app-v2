import TrustedResourceDetailPage from "@/features/trusted-resources/components/TrustedResourceDetailPage";
import { listTrustedResourceSlugs } from "@/features/trusted-resources/api/trustedResourceCatalogApi";

export function generateStaticParams() {
  return listTrustedResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const key = String(slug || "").trim();
  return {
    title: key ? `${key.replace(/-/g, " ")} | Trusted Resource` : "Trusted Resource",
    description: "Curated trusted resource profile on The Outreach Project.",
  };
}

export default async function TrustedResourceSlugPage({ params }) {
  const { slug } = await params;
  return <TrustedResourceDetailPage slug={slug} />;
}
