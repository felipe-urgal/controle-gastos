import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { categoryCrud } from "@/app/lib/categories/category-crud";
import { prisma } from "@/app/lib/prisma";

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

async function createFixture() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Category Owner",
      email: `category-owner-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);

  const category = await prisma.category.create({
    data: {
      name: `Mercado ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: user.id,
    },
  });

  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return { category };
}

function updateRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/categories/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("category structural type", () => {
  it("rejects changing the category type even without financial history", async () => {
    const { category } = await createFixture();
    const response = await categoryCrud.update(
      updateRequest(category.id, { type: "INCOME" }),
      { params: Promise.resolve({ id: category.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error?.code).toBe("CATEGORY_TYPE_IMMUTABLE");
    expect(
      (await prisma.category.findUnique({ where: { id: category.id } }))?.type,
    ).toBe("EXPENSE");
  });

  it("keeps non-structural edits available", async () => {
    const { category } = await createFixture();
    const response = await categoryCrud.update(
      updateRequest(category.id, { name: "Mercado atualizado" }),
      { params: Promise.resolve({ id: category.id }) },
    );

    expect(response.status).toBe(200);
    expect(
      (await prisma.category.findUnique({ where: { id: category.id } }))?.name,
    ).toBe("Mercado atualizado");
  });
});
