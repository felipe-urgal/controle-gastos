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
  await prisma.authRateLimit.deleteMany({
    where: { action: { in: ["step-up-ip", "step-up-user"] } },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function createUser(overrides: Record<string, unknown> = {}) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Delete Review",
      email: `delete-review-${suffix}@example.test`,
      password: await bcrypt.hash("SenhaAtual123", 10),
      ...overrides,
    },
  });
  cleanupUserIds.push(user.id);
  mocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return user;
}

describe("DELETE /api/user step-up", () => {
  it("does not delete the account with session authentication alone", async () => {
    const user = await createUser();

    const response = await DELETE(
      new Request("http://localhost/api/user", { method: "DELETE" }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });

  it("deletes a non-MFA account only after the current password is confirmed", async () => {
    const user = await createUser();

    const response = await DELETE(
      new Request("http://localhost/api/user", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: "SenhaAtual123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
  });

  it("requires a second factor when MFA is enabled", async () => {
    const user = await createUser({
      totpEnabled: true,
      totpSecretEncrypted: "opaque-enrollment-envelope",
      totpActivatedAt: new Date(),
    });

    const response = await DELETE(
      new Request("http://localhost/api/user", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: "SenhaAtual123" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("MFA_FACTOR_REQUIRED");
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
