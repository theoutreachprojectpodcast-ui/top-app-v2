import { redirect } from "next/navigation";

export default function PodcastSponsorRedirectRoute() {
  redirect("/podcasts?sponsor=1");
}
