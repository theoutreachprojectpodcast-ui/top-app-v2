import { redirect } from "next/navigation";
import PodcastGuestsPage from "@/features/podcasts/components/PodcastGuestsPage";
import { getCachedPodcastGuestDirectory } from "@/lib/podcast/getCachedPodcastLanding";

/** Episode-linked guest directory; hidden when no verified guests exist. */
export default async function PodcastsGuestsRoute() {
  const { guests } = await getCachedPodcastGuestDirectory();
  if (!guests?.length) redirect("/podcasts");
  return <PodcastGuestsPage guests={guests} />;
}
