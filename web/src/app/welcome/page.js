import { redirect } from "next/navigation";

/** Alias for the gated welcome entry at `/`. */
export default function WelcomeAliasPage() {
  redirect("/");
}
