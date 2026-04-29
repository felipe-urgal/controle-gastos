import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getAuthenticatedUserId() {
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };

    return decoded.sub;
  } catch {
    throw new Error("INVALID_TOKEN");
  }
};
