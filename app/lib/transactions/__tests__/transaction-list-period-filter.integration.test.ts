import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("transaction list period filter", () => {
  it.each([
    "month=0",
    "month=13",
    "month=1.5",
    "month=-1",
    "year=99",
    "year=1e3",
    "year=2026.5",
  ])("rejects %s with 400", async (query) => {
    const owner = await prisma.user.create({
      data: {
        name: "Period Filter Owner",
        email: `period-filter-${randomUUID()}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await transactionCrud.list(
      new Request(`http://localhost/api/transactions?${query}`),
    );

    expect(response.status).toBe(400);
  });
});
