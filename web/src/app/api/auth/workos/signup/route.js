import { workOSSignUpResponse } from "@/lib/auth/workosSignUpHandler";

export async function GET(request) {
  return workOSSignUpResponse(request);
}
