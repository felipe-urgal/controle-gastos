import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyEmailVerificationToken: vi.fn(),
  getRequestId: vi.fn(() => "request-1"),
  logEvent: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdateMany: vi.fn(),
}));

vi.mock("@/app/lib/auth/email-verification-token", () => ({
  verifyEmailVerificationToken: mocks.verifyEmailVerificationToken,
}));

vi.mock("@/app/lib/observability", () => ({
  getRequestId: mocks.getRequestId,
  logEvent: mocks.logEvent,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      updateMany: mocks.userUpdateMany,
    },
  },
}));

import { GET } from "@/app/api/auth/verify-email/route";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const newEmail = "novo@example.com";

function emailChangeVerification(pendingEmailVersion = 2) {
  return {
    userId,
    email: newEmail,
    kind: "email-change" as const,
    authVersion: 3,
    pendingEmailVersion,
  };
}

function pendingUser(overrides: Record<string, unknown> = {}) {
  return {
    id: userId,
    email: "atual@example.com",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    authVersion: 3,
    isActive: true,
    pendingEmail: newEmail,
    pendingEmailExpiresAt: new Date(Date.now() + 60_000),
    pendingEmailVersion: 2,
    ...overrides,
  };
}

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("confirms only the current pending email request and clears its state", async () => {
    mocks.verifyEmailVerificationToken.mockReturnValue(emailChangeVerification());
    mocks.userFindUnique.mockResolvedValue(pendingUser());

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?token=valid"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?verification=email-changed",
    );
    expect(response.headers.get("set-cookie")).toContain("token=");

    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: {
        id: userId,
        authVersion: 3,
        pendingEmail: newEmail,
        pendingEmailVersion: 2,
        pendingEmailExpiresAt: { gt: expect.any(Date) },
      },
      data: {
        email: newEmail,
        emailVerifiedAt: expect.any(Date),
        authVersion: { increment: 1 },
        pendingEmail: null,
        pendingEmailRequestedAt: null,
        pendingEmailExpiresAt: null,
        pendingEmailVersion: { increment: 1 },
      },
    });
  });

  it("rejects a superseded email-change link", async () => {
    mocks.verifyEmailVerificationToken.mockReturnValue(
      emailChangeVerification(1),
    );
    mocks.userFindUnique.mockResolvedValue(pendingUser());

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?token=stale"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?verification=invalid",
    );
    expect(mocks.userFindFirst).not.toHaveBeenCalled();
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects an expired pending email request", async () => {
    mocks.verifyEmailVerificationToken.mockReturnValue(emailChangeVerification());
    mocks.userFindUnique.mockResolvedValue(
      pendingUser({
        pendingEmailExpiresAt: new Date(Date.now() - 1_000),
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?token=expired"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?verification=invalid",
    );
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
  });

  it("preserves the signup verification flow", async () => {
    mocks.verifyEmailVerificationToken.mockReturnValue({
      userId,
      email: "signup@example.com",
      kind: "signup",
      authVersion: 0,
      pendingEmailVersion: undefined,
    });
    mocks.userFindUnique.mockResolvedValue({
      ...pendingUser({
        email: "signup@example.com",
        emailVerifiedAt: null,
        authVersion: 0,
        pendingEmail: null,
        pendingEmailExpiresAt: null,
        pendingEmailVersion: 0,
      }),
    });

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?token=signup"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?verification=success",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: {
        id: userId,
        email: "signup@example.com",
        authVersion: 0,
        emailVerifiedAt: null,
      },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });
});
