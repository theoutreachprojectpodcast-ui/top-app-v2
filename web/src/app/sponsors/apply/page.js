import { redirect } from "next/navigation";

export default function SponsorsApplyRedirectRoute() {
  redirect("/sponsors?apply=1");
}
