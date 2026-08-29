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

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));

import { userCrud } from "../user.crud";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const existingUser = {
  id: userId,
  name: "Usuário",
  email: "usuario@example.com",
  password: "current-hash",
  showValues: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("userCrud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue(userId);
  });

  it("deletes the authenticated user exactly once", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.user.delete.mockResolvedValue({ id: userId });

    const response = await userCrud.remove(
      new Request("http://localhost/api/user", { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(mocks.user.findFirst).toHaveBeenCalledWith({
      where: { id: userId },
      include: undefined,
    });
    expect(mocks.user.delete).toHaveBeenCalledTimes(1);
    expect(mocks.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
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
      })
    );

    expect(response.status).toBe(200);
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
        body: JSON.stringify({ newPassword: "nova-senha" }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("returns 401 when the current password is invalid", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.bcryptCompare.mockResolvedValue(false);

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "senha-errada",
          newPassword: "nova-senha",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("hashes a new password and never persists credential helper fields", async () => {
    mocks.user.findFirst.mockResolvedValue(existingUser);
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.bcryptHash.mockResolvedValue("new-password-hash");
    mocks.user.update.mockResolvedValue(existingUser);

    const response = await userCrud.update(
      new Request("http://localhost/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: "senha-atual",
          newPassword: "nova-senha",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.bcryptCompare).toHaveBeenCalledWith(
      "senha-atual",
      "current-hash"
    );
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { password: "new-password-hash" },
      include: undefined,
    });
  });
});
