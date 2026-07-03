import { redirect } from "next/navigation";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

/** Legacy alias for post-OAuth session refresh route. */
export default function MobilePostLoginPage() {
  redirect(MOBILE_POST_LOGIN_PATH);
}
