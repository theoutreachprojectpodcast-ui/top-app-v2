import { workOSSignInResponse } from "@/lib/auth/workosSignInHandler";

/** WorkOS Redirects → Sign-in endpoint (https://theoutreachproject.app/sign-in). */
export async function GET(request) {
  return workOSSignInResponse(request);
}
