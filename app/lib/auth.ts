import { cookies } from "next/headers";
import { verifyAuthToken } from "@/app/lib/auth-token";

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    return verifyAuthToken(token).userId;
  } catch {
    // Do not leak whether the token is malformed, expired or has invalid claims.
    throw new Error("UNAUTHORIZED");
  }
}
