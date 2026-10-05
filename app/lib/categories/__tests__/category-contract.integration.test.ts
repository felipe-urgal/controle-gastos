import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { categoryCrud } from "@/app/lib/categories/category-crud";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
} from "@/app/lib/categories/category-limits";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/app/lib/categories/category-schema";
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

async function createUser() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Category Contract Owner",
      email: `category-contract-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return user;
}

function request(method: "POST" | "PUT", path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("category contract", () => {
  it("maps duplicate name/type to a domain conflict", async () => {
    await createUser();
    const payload = {
      name: "Mercado",
      type: "EXPENSE",
      description: null,
      isActive: true,
    };

    expect((await categoryCrud.create(request("POST", "/api/categories", payload))).status).toBe(201);
    const duplicate = await categoryCrud.create(
      request("POST", "/api/categories", payload),
    );
    const body = await duplicate.json();

    expect(duplicate.status).toBe(409);
    expect(body.error?.code).toBe("CATEGORY_NAME_CONFLICT");
  });

  it("allows clearing an existing description", async () => {
    const user = await createUser();
    const category = await prisma.category.create({
      data: {
        name: "Descrição",
        type: "EXPENSE",
        description: "Texto antigo",
        userId: user.id,
      },
    });

    const response = await categoryCrud.update(
      request("PUT", `/api/categories/${category.id}`, { description: null }),
      { params: Promise.resolve({ id: category.id }) },
    );

    expect(response.status).toBe(200);
    expect(
      (await prisma.category.findUnique({ where: { id: category.id } }))?.description,
    ).toBeNull();
  });

  it("keeps schema and database description limits aligned", () => {
    expect(
      createCategorySchema.safeParse({
        name: "Mercado",
        type: "EXPENSE",
        description: "x".repeat(CATEGORY_DESCRIPTION_MAX_LENGTH),
      }).success,
    ).toBe(true);

    expect(
      updateCategorySchema.safeParse({
        description: "x".repeat(CATEGORY_DESCRIPTION_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});
