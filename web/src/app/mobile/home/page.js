import { redirect } from "next/navigation";

/** Authenticated mobile home — same as TopApp `/`. */
export default function MobileHomePage() {
  redirect("/");
}
