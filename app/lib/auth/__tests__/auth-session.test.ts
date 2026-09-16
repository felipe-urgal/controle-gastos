import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

import { getAuthenticatedUserId } from "@/app/lib/auth";

const JWT_SECRET = "test-jwt-secret-with-sufficient-length";
const userId = "550e8400-e29b-41d4-a716-446655440000";

function sessionToken(authVersion: number) {
  return jwt.sign({ sub: userId, authVersion }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    issuer: "seu-app",
    audience: "seu-app-users",
  });
}

describe("authenticated session state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  function useToken(token: string) {
    mocks.cookies.mockResolvedValue({
      get: (name: string) => (name === "token" ? { value: token } : undefined),
    });
  }

  it("accepts an active user whose authentication version matches the token", async () => {
    useToken(sessionToken(2));
    mocks.userFindUnique.mockResolvedValue({
      id: userId,
      isActive: true,
      authVersion: 2,
    });

    await expect(getAuthenticatedUserId()).resolves.toBe(userId);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { id: true, isActive: true, authVersion: true },
    });
  });

  it("rejects a token issued before the current authentication version", async () => {
    useToken(sessionToken(1));
    mocks.userFindUnique.mockResolvedValue({
      id: userId,
      isActive: true,
      authVersion: 2,
    });

    await expect(getAuthenticatedUserId()).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects an inactive user even when the token version matches", async () => {
    useToken(sessionToken(2));
    mocks.userFindUnique.mockResolvedValue({
      id: userId,
      isActive: false,
      authVersion: 2,
    });

    await expect(getAuthenticatedUserId()).rejects.toThrow("UNAUTHORIZED");
  });
});
