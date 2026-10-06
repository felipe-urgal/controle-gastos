import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { tagCrud } from "@/app/lib/tags/tag-crud";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function createRequest(name: string) {
  return new Request("http://localhost/api/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

function updateRequest(id: string, name: string) {
  return new Request(`http://localhost/api/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

describe("tag CRUD canonical identity", () => {
  it("treats case, visual # prefix and repeated spaces as the same identity", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const created = await tagCrud.create(createRequest("  #Ferias   2026 "));
    const conflict = await tagCrud.create(createRequest("ferias 2026"));
    const createdBody = await created.json();
    const conflictBody = await conflict.json();

    expect(created.status).toBe(201);
    expect(createdBody.data.name).toBe("Ferias 2026");
    expect(createdBody.data).not.toHaveProperty("normalizedName");
    expect(conflict.status).toBe(409);
    expect(conflictBody.error.code).toBe("TAG_NAME_CONFLICT");
  });

  it("keeps accents as part of identity while normalizing unicode composition", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const accented = await tagCrud.create(createRequest("Férias"));
    const unaccented = await tagCrud.create(createRequest("Ferias"));
    const decomposedConflict = await tagCrud.create(
      createRequest("Fe\u0301rias"),
    );

    expect(accented.status).toBe(201);
    expect(unaccented.status).toBe(201);
    expect(decomposedConflict.status).toBe(409);
  });

  it("returns one success and one 409 for concurrent equivalent creates", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const responses = await Promise.all([
      tagCrud.create(createRequest("Concorrente")),
      tagCrud.create(createRequest("#concorrente")),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.tag.count({
        where: { userId: owner.id, normalizedName: "concorrente" },
      }),
    ).toBe(1);
  });

  it("returns one success and one 409 for concurrent equivalent renames", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const [first, second] = await Promise.all([
      prisma.tag.create({
        data: {
          userId: owner.id,
          name: "Primeira",
          normalizedName: "primeira",
        },
      }),
      prisma.tag.create({
        data: {
          userId: owner.id,
          name: "Segunda",
          normalizedName: "segunda",
        },
      }),
    ]);

    const responses = await Promise.all([
      tagCrud.update(updateRequest(first.id, "Destino"), {
        params: Promise.resolve({ id: first.id }),
      }),
      tagCrud.update(updateRequest(second.id, "#destino"), {
        params: Promise.resolve({ id: second.id }),
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.tag.count({
        where: { userId: owner.id, normalizedName: "destino" },
      }),
    ).toBe(1);
  });
});
