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

import { userCrud } from "../user.crud";

describe("userCrud.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the authenticated user exactly once", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    mocks.getAuthenticatedUserId.mockResolvedValue(userId);
    mocks.user.findFirst.mockResolvedValue({
      id: userId,
      name: "Usuário",
      email: "usuario@example.com",
      showValues: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
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
});
