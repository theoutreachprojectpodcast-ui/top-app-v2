import { workOSSignUpResponse } from "@/lib/auth/workosSignUpHandler";

/** WorkOS sign-up entry (alias for invitation and hosted AuthKit flows). */
export async function GET(request) {
  return workOSSignUpResponse(request);
}
