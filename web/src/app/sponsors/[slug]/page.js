import SponsorProfilePage from "@/features/sponsors/components/SponsorProfilePage";

export default async function SponsorSlugPage({ params }) {
  const { slug } = await params;
  return <SponsorProfilePage slug={slug} />;
}
