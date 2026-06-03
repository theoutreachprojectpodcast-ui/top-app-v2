import { workOSSignInResponse } from "@/lib/auth/workosSignInHandler";

export async function GET(request) {
  return workOSSignInResponse(request);
}
