import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
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


  it("paginates large catalogs and finds a tag outside the first page by search", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.tag.createMany({
      data: Array.from({ length: 1_005 }, (_, index) => {
        const suffix = String(index).padStart(4, "0");
        return {
          userId: owner.id,
          name: `catalogo-${suffix}`,
          normalizedName: `catalogo-${suffix}`,
        };
      }),
    });

    const unpaginated = await tagCrud.list(
      new Request("http://localhost/api/tags"),
    );
    const unpaginatedBody = await unpaginated.json();
    expect(unpaginated.status).toBe(400);
    expect(unpaginatedBody.error.code).toBe("PAGINATION_REQUIRED");

    const firstPage = await tagCrud.list(
      new Request("http://localhost/api/tags?page=1&pageSize=50"),
    );
    const firstPageBody = await firstPage.json();

    expect(firstPage.status).toBe(200);
    expect(firstPageBody.data.items).toHaveLength(50);
    expect(firstPageBody.data.total).toBe(1_005);
    expect(firstPageBody.data.totalPages).toBe(21);
    expect(
      firstPageBody.data.items.some(
        (tag: { name: string }) => tag.name === "catalogo-1004",
      ),
    ).toBe(false);

    const searched = await tagCrud.list(
      new Request(
        "http://localhost/api/tags?page=1&pageSize=50&search=catalogo-1004",
      ),
    );
    const searchedBody = await searched.json();

    expect(searched.status).toBe(200);
    expect(searchedBody.data.total).toBe(1);
    expect(searchedBody.data.items).toEqual([
      expect.objectContaining({ name: "catalogo-1004" }),
    ]);
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

  it("lista o gasto do mês de cada tag por moeda, sem misturar outro usuário", async () => {
    const owner = await factory.user();
    const other = await factory.user();
    const [brl, usd] = await Promise.all([
      factory.account(owner.id),
      factory.account(owner.id, { currency: "USD" }),
    ]);
    const category = await factory.category(owner.id, { type: "EXPENSE" });
    const tag = await prisma.tag.create({
      data: { userId: owner.id, name: "casa", normalizedName: "casa" },
    });
    await prisma.tag.create({
      data: { userId: owner.id, name: "vazia", normalizedName: "vazia" },
    });
    const today = logicalDateFromUtcInstant(new Date());

    for (const [account, amount, month] of [
      [brl, 4_000, today.month],
      [usd, 900, today.month],
      [brl, 50_000, today.month === 1 ? 12 : today.month - 1],
    ] as const) {
      const transaction = await factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: {
          amount,
          type: "EXPENSE",
          year: month > today.month ? today.year - 1 : today.year,
          month,
        },
      });
      await prisma.transactionTag.create({
        data: { userId: owner.id, transactionId: transaction.id, tagId: tag.id },
      });
    }

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await tagCrud.list(
      new Request("http://localhost/api/tags?page=1&pageSize=50"),
    );
    const items = (await response.json()).data.items as Array<{
      name: string;
      monthExpenses: Array<{ currency: string; expense: number }>;
    }>;

    expect(items.find((item) => item.name === "casa")?.monthExpenses).toEqual([
      { currency: "BRL", expense: 4_000 },
      { currency: "USD", expense: 900 },
    ]);
    expect(items.find((item) => item.name === "vazia")?.monthExpenses).toEqual([]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const otherBody = await (
      await tagCrud.list(new Request("http://localhost/api/tags?page=1&pageSize=50"))
    ).json();
    expect(otherBody.data.items).toEqual([]);
  });
});
