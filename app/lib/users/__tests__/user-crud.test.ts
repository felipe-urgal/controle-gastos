import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const user = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  return {
    getAuthenticatedUserId: vi.fn(),
    bcryptCompare: vi.fn(),
    bcryptHash: vi.fn(),
    consumeStepUpRateLimit: vi.fn(),
    sendEmailVerification: vi.fn(),
    signEmailVerificationToken: vi.fn(),
    user,
    prisma: {
      user,
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/app/lib/security/step-up-auth", () => ({
  consumeStepUpRateLimit: mocks.consumeStepUpRateLimit,
}));

vi.mock("@/app/lib/auth/auth-email", () => ({
  sendEmailVerification: mocks.sendEmailVerification,
}));

vi.mock("@/app/lib/auth/email-verification-token", () => ({
  EMAIL_VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000,
  signEmailVerificationToken: mocks.signEmailVerificationToken,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));

import { userCrud } from "../user-crud";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const existingUser = {
  id: userId,
  name: "Usuário",
  email: "usuario@example.com",
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  pendingEmail: null,
  pendingEmailRequestedAt: null,
  pendingEmailExpiresAt: null,
  pendingEmailVersion: 0,
  password: "current-hash",
  authVersion: 3,
  showValues: true,
  periodicSummaryEnabled: false,
  periodicSummaryFrequency: "WEEKLY",
  totpEnabled: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("userCrud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue(userId);
    mocks.consumeStepUpRateLimit.mockResolvedValue(undefined);
    mocks.signEmailVerificationToken.mockReturnValue("verification-token");
    mocks.sendEmailVerification.mockResolvedValue(undefined);
  });

  it("does not expose the generic remove handler", () => {
    expect(userCrud).not.toHaveProperty("remove");
  });

  it("allows a name-only update without the current password", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.user.update.mockResolvedValue({
      ...existingUser,
      name: "Novo nome",
    });

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({ name: "Novo nome" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.consumeStepUpRateLimit).not.toHaveBeenCalled();
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { name: "Novo nome" },
      include: undefined,
    });
  });

  it("rejects a password change without the current password", async () => {
    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({ newPassword: "NovaSenha123" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("rejects an email change without the current password", async () => {
    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({ email: "novo@example.com" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("rate limits before checking an invalid current password", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.bcryptCompare.mockResolvedValue(false);

    const request = new Request("http://localhost/api/user", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "senha-errada",
        newPassword: "NovaSenha123",
      }),
    });
    const response = await userCrud.update(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    expect(mocks.consumeStepUpRateLimit).toHaveBeenCalledWith({ request, userId });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("hashes a new password, revokes old sessions, and never persists helper fields", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.bcryptHash.mockResolvedValue("new-password-hash");
    mocks.user.update.mockResolvedValue(existingUser);

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "senha-atual",
          newPassword: "NovaSenha123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.bcryptCompare).toHaveBeenCalledWith(
      "senha-atual",
      "current-hash",
    );
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        password: "new-password-hash",
        authVersion: { increment: 1 },
      },
      include: undefined,
    });
  });

  it("persists a versioned pending email without replacing the current email", async () => {
    mocks.user.findFirst
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(null);
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.user.update.mockResolvedValue(existingUser);

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "senha-atual",
          email: "novo@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.consumeStepUpRateLimit).toHaveBeenCalledWith({
      request: expect.any(Request),
      userId,
    });
    expect(mocks.signEmailVerificationToken).toHaveBeenCalledWith({
      userId,
      email: "novo@example.com",
      kind: "email-change",
      authVersion: 3,
      pendingEmailVersion: 1,
    });
    expect(mocks.sendEmailVerification).toHaveBeenCalledWith({
      to: "novo@example.com",
      name: "Usuário",
      token: "verification-token",
    });

    const updateCall = mocks.user.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: userId });
    expect(updateCall.data).toEqual({
      pendingEmail: "novo@example.com",
      pendingEmailRequestedAt: expect.any(Date),
      pendingEmailExpiresAt: expect.any(Date),
      pendingEmailVersion: { increment: 1 },
    });
    expect(updateCall.data).not.toHaveProperty("email");
    expect(updateCall.data.pendingEmailExpiresAt.getTime()).toBeGreaterThan(
      updateCall.data.pendingEmailRequestedAt.getTime(),
    );
  });

  it("increments the pending version when resending so the previous link becomes stale", async () => {
    const pendingUser = {
      ...existingUser,
      pendingEmail: "novo@example.com",
      pendingEmailRequestedAt: new Date(),
      pendingEmailExpiresAt: new Date(Date.now() + 60_000),
      pendingEmailVersion: 4,
    };
    mocks.user.findFirst
      .mockResolvedValueOnce(pendingUser)
      .mockResolvedValueOnce(null);
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.user.update.mockResolvedValue(pendingUser);

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "senha-atual",
          email: "novo@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.signEmailVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ pendingEmailVersion: 5 }),
    );
    expect(mocks.user.update.mock.calls[0][0].data.pendingEmailVersion).toEqual({
      increment: 1,
    });
  });

  it("cancels a pending email without step-up and invalidates issued links", async () => {
    const pendingUser = {
      ...existingUser,
      pendingEmail: "novo@example.com",
      pendingEmailRequestedAt: new Date(),
      pendingEmailExpiresAt: new Date(Date.now() + 60_000),
      pendingEmailVersion: 2,
    };
    mocks.user.findFirst.mockResolvedValue(pendingUser);
    mocks.user.update.mockResolvedValue({
      ...pendingUser,
      pendingEmail: null,
      pendingEmailRequestedAt: null,
      pendingEmailExpiresAt: null,
      pendingEmailVersion: 3,
    });

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({ cancelPendingEmail: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.consumeStepUpRateLimit).not.toHaveBeenCalled();
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        pendingEmail: null,
        pendingEmailRequestedAt: null,
        pendingEmailExpiresAt: null,
        pendingEmailVersion: { increment: 1 },
      },
      include: undefined,
    });
  });
});
