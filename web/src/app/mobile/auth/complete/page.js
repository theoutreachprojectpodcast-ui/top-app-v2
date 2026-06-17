import { redirect } from "next/navigation";

/** Legacy post-auth URL — land on home; `MobileOAuthSessionResume` handles session refresh. */
export default function MobileAuthCompletePage() {
  redirect("/?oauth=1");
}
