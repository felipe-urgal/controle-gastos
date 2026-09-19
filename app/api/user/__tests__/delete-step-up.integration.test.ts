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
import { clearRateLimit } from "@/app/lib/security/rate-limit";

const cleanupUserIds: string[] = [];

afterEach(async () => {
  const userIds = cleanupUserIds.splice(0);

  await Promise.all(
    userIds.flatMap((userId) => [
      clearRateLimit("step-up-user", userId),
      clearRateLimit("step-up-ip", `delete-step-up-${userId}`),
    ]),
  );

  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
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

function deleteRequest(
  userId: string,
  init: Omit<RequestInit, "method"> = {},
) {
  const headers = new Headers(init.headers);
  headers.set("x-forwarded-for", `delete-step-up-${userId}`);

  return new Request("http://localhost/api/user", {
    ...init,
    method: "DELETE",
    headers,
  });
}

describe("DELETE /api/user step-up", () => {
  it("does not delete the account with session authentication alone", async () => {
    const user = await createUser();

    const response = await DELETE(deleteRequest(user.id));

    expect(response.status).toBe(400);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });

  it("deletes a non-MFA account only after the current password is confirmed", async () => {
    const user = await createUser();

    const response = await DELETE(
      deleteRequest(user.id, {
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
      deleteRequest(user.id, {
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
