import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

import { DELETE } from "@/app/api/user/route";
import { prisma } from "@/app/lib/prisma";

const cleanupUserIds: string[] = [];

afterEach(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: cleanupUserIds.splice(0) } },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/user step-up", () => {
  it("does not delete the account with session authentication alone", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Delete Review",
        email: `delete-review-${suffix}@example.test`,
        password: await bcrypt.hash("SenhaAtual123", 10),
      },
    });
    cleanupUserIds.push(user.id);
    mocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const response = await DELETE(
      new Request("http://localhost/api/user", { method: "DELETE" }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
