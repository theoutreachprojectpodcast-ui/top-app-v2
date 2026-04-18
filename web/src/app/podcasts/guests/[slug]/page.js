import PodcastGuestProfilePage from "@/features/podcasts/components/PodcastGuestProfilePage";

export default async function PodcastsGuestProfileRoute({ params }) {
  const resolvedParams = await params;
  return <PodcastGuestProfilePage slug={resolvedParams?.slug} />;
}
