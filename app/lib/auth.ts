import { cookies } from "next/headers";

import { verifyAuthToken } from "@/app/lib/auth/auth-token";
import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";

export { UnauthorizedError, isUnauthorizedError } from "@/app/lib/auth/auth-errors";

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    throw new UnauthorizedError();
  }

  let session: ReturnType<typeof verifyAuthToken>;

  try {
    session = verifyAuthToken(token);
  } catch {
    // Do not leak whether the token is malformed, expired or has invalid claims.
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, authVersion: true },
  });

  if (
    !user ||
    !user.isActive ||
    user.authVersion !== session.authVersion
  ) {
    throw new UnauthorizedError();
  }

  return user.id;
}
