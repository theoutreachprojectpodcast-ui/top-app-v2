import { workOSSignUpResponse } from "@/lib/auth/workosSignUpHandler";

/** Alias for WorkOS sign-up (`/sign-up`). Used by mobile external-browser signup links. */
export async function GET(request) {
  return workOSSignUpResponse(request);
}
