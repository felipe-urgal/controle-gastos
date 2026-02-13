import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

interface SessionPayload {
  userId: string;
}

function extractTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const tokenPart = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="));

  if (!tokenPart) return null;

  const token = tokenPart.substring("token=".length);
  return token ? decodeURIComponent(token) : null;
}

function decodeToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function getAuthUserIdFromRequest(request: Request): string | null {
  const token = extractTokenFromCookieHeader(request.headers.get("cookie"));
  if (!token) return null;

  const session = decodeToken(token);
  return session?.userId ?? null;
}

export async function getAuthUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const session = decodeToken(token);
  return session?.userId ?? null;
}
