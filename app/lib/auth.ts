import { cookies } from "next/headers";

import { verifyAuthToken } from "@/app/lib/auth/auth-token";
import { prisma } from "@/app/lib/prisma";

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

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
