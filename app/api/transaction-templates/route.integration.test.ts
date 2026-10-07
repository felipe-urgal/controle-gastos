import { randomUUID } from "node:crypto";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  GET as listTemplates,
  POST as createTemplate,
} from "@/app/api/transaction-templates/route";
import {
  DELETE as deleteTemplate,
  GET as getTemplate,
  PUT as updateTemplate,
} from "@/app/api/transaction-templates/[id]/route";
import { prisma } from "@/app/lib/prisma";
import { TRANSACTION_MAX_AMOUNT_CENTS } from "@/app/lib/transactions/transaction-field-contract";

const createdUserIds: string[] = [];

async function createFixture(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: `Usuário ${label}`,
      email: `template-${label}-${suffix}@example.test`,
      password: `hash-${label}`,
    },
  });
  createdUserIds.push(user.id);

  const [account, inactiveAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta ${label}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        isActive: true,
        userId: user.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta inativa ${label}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        isActive: false,
        userId: user.id,
      },
    }),
  ]);

  const [category, inactiveCategory] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Categoria ${label}`,
        type: "EXPENSE",
        isActive: true,
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Categoria inativa ${label}`,
        type: "EXPENSE",
        isActive: false,
        userId: user.id,
      },
    }),
  ]);

  return { user, account, inactiveAccount, category, inactiveCategory };
}

function jsonRequest(
  url: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>,
) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function responseBody(response: Response) {
  return JSON.parse(await response.text());
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transaction templates HTTP contract", () => {
  it("supports owned CRUD, pagination/search and never exposes internal/status fields", async () => {
    const owner = await createFixture("owner");
    const other = await createFixture("other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);

    const createdResponse = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Almoço semanal",
        type: "EXPENSE",
        description: "a".repeat(100),
        amount: TRANSACTION_MAX_AMOUNT_CENTS,
        accountId: owner.account.id,
        categoryId: owner.category.id,
        isFavorite: false,
      }),
    );
    const createdBody = await responseBody(createdResponse);

    expect(createdResponse.status).toBe(201);
    expect(createdBody.data).toMatchObject({
      name: "Almoço semanal",
      description: "a".repeat(100),
      amount: TRANSACTION_MAX_AMOUNT_CENTS,
      isFavorite: false,
      account: {
        id: owner.account.id,
        isActive: true,
      },
      category: {
        id: owner.category.id,
        type: "EXPENSE",
        isActive: true,
      },
    });
    expect(createdBody.data).not.toHaveProperty("status");
    expect(createdBody.data).not.toHaveProperty("normalizedName");
    expect(createdBody.data).not.toHaveProperty("position");

    const id = createdBody.data.id as string;

    const listResponse = await listTemplates(
      new Request(
        "http://localhost/api/transaction-templates?page=1&pageSize=10&search=almoço",
      ),
    );
    const listBody = await responseBody(listResponse);
    expect(listResponse.status).toBe(200);
    expect(listBody.data).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    expect(listBody.data.items).toHaveLength(1);

    const updateResponse = await updateTemplate(
      jsonRequest(
        `http://localhost/api/transaction-templates/${id}`,
        "PUT",
        { name: "Almoço editado", isFavorite: true },
      ),
      context(id),
    );
    const updateBody = await responseBody(updateResponse);
    expect(updateResponse.status).toBe(200);
    expect(updateBody.data).toMatchObject({
      id,
      name: "Almoço editado",
      isFavorite: true,
    });

    const emptyUpdate = await updateTemplate(
      jsonRequest(
        `http://localhost/api/transaction-templates/${id}`,
        "PUT",
        {},
      ),
      context(id),
    );
    expect(emptyUpdate.status).toBe(400);

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.user.id);
    const foreignGet = await getTemplate(
      new Request(`http://localhost/api/transaction-templates/${id}`),
      context(id),
    );
    expect(foreignGet.status).toBe(404);

    const foreignUpdate = await updateTemplate(
      jsonRequest(
        `http://localhost/api/transaction-templates/${id}`,
        "PUT",
        { isFavorite: false },
      ),
      context(id),
    );
    expect(foreignUpdate.status).toBe(404);

    const foreignDelete = await deleteTemplate(
      new Request(`http://localhost/api/transaction-templates/${id}`, {
        method: "DELETE",
      }),
      context(id),
    );
    expect(foreignDelete.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);
    const sourceTransaction = await prisma.transaction.create({
      data: {
        amount: 2500,
        year: 2026,
        month: 10,
        day: 6,
        type: "EXPENSE",
        description: "Transação independente do Modelo",
        status: "COMPLETED",
        accountId: owner.account.id,
        categoryId: owner.category.id,
        userId: owner.user.id,
      },
    });

    const deleteResponse = await deleteTemplate(
      new Request(`http://localhost/api/transaction-templates/${id}`, {
        method: "DELETE",
      }),
      context(id),
    );
    expect(deleteResponse.status).toBe(200);
    expect(
      await prisma.transaction.count({ where: { id: sourceTransaction.id } }),
    ).toBe(1);
  });

  it("returns deterministic 409 for semantically duplicate names, including a concurrent race", async () => {
    const owner = await createFixture("conflict");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);

    const [first, second] = await Promise.all([
      createTemplate(
        jsonRequest("http://localhost/api/transaction-templates", "POST", {
          name: "Mercado do bairro",
          type: "EXPENSE",
        }),
      ),
      createTemplate(
        jsonRequest("http://localhost/api/transaction-templates", "POST", {
          name: "  mercado   do bairro ",
          type: "EXPENSE",
        }),
      ),
    ]);

    const responses = [first, second].sort(
      (left, right) => left.status - right.status,
    );
    expect(responses.map((response) => response.status)).toEqual([201, 409]);

    const conflictBody = await responseBody(responses[1]);
    expect(conflictBody.error).toMatchObject({
      code: "TEMPLATE_NAME_CONFLICT",
      message: "Já existe um Modelo com esse nome",
    });

    expect(
      await prisma.transactionTemplate.count({
        where: { userId: owner.user.id },
      }),
    ).toBe(1);
  });

  it("returns one success and one 409 for concurrent equivalent updates", async () => {
    const owner = await createFixture("update-conflict");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);

    const firstCreate = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Modelo origem A",
        type: "EXPENSE",
      }),
    );
    const secondCreate = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Modelo origem B",
        type: "EXPENSE",
      }),
    );

    const firstBody = await responseBody(firstCreate);
    const secondBody = await responseBody(secondCreate);

    const [firstUpdate, secondUpdate] = await Promise.all([
      updateTemplate(
        jsonRequest(
          `http://localhost/api/transaction-templates/${firstBody.data.id}`,
          "PUT",
          { name: "Destino compartilhado" },
        ),
        context(firstBody.data.id),
      ),
      updateTemplate(
        jsonRequest(
          `http://localhost/api/transaction-templates/${secondBody.data.id}`,
          "PUT",
          { name: "  destino   compartilhado " },
        ),
        context(secondBody.data.id),
      ),
    ]);

    const responses = [firstUpdate, secondUpdate].sort(
      (left, right) => left.status - right.status,
    );
    expect(responses.map((response) => response.status)).toEqual([200, 409]);

    const conflictBody = await responseBody(responses[1]);
    expect(conflictBody.error).toMatchObject({
      code: "TEMPLATE_NAME_CONFLICT",
      message: "Já existe um Modelo com esse nome",
    });

    expect(
      await prisma.transactionTemplate.count({
        where: {
          userId: owner.user.id,
          normalizedName: "destino compartilhado",
        },
      }),
    ).toBe(1);
  });

  it("allows the same canonical name for another user", async () => {
    const first = await createFixture("same-name-a");
    const second = await createFixture("same-name-b");

    authMocks.getAuthenticatedUserId.mockResolvedValue(first.user.id);
    expect(
      (
        await createTemplate(
          jsonRequest("http://localhost/api/transaction-templates", "POST", {
            name: "Assinatura",
            type: "EXPENSE",
          }),
        )
      ).status,
    ).toBe(201);

    authMocks.getAuthenticatedUserId.mockResolvedValue(second.user.id);
    expect(
      (
        await createTemplate(
          jsonRequest("http://localhost/api/transaction-templates", "POST", {
            name: "assinatura",
            type: "EXPENSE",
          }),
        )
      ).status,
    ).toBe(201);
  });

  it("rejects invalid limits and new inactive references while allowing simple edits with a legacy inactive reference", async () => {
    const owner = await createFixture("limits");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);

    const tooLongDescription = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Descrição longa",
        type: "EXPENSE",
        description: "a".repeat(101),
      }),
    );
    expect(tooLongDescription.status).toBe(400);

    const amountOverflow = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Valor grande",
        type: "EXPENSE",
        amount: TRANSACTION_MAX_AMOUNT_CENTS + 1,
      }),
    );
    expect(amountOverflow.status).toBe(400);

    const inactiveAccount = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Conta inativa",
        type: "EXPENSE",
        accountId: owner.inactiveAccount.id,
      }),
    );
    expect(inactiveAccount.status).toBe(400);

    const inactiveCategory = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Categoria inativa",
        type: "EXPENSE",
        categoryId: owner.inactiveCategory.id,
      }),
    );
    expect(inactiveCategory.status).toBe(400);

    const created = await createTemplate(
      jsonRequest("http://localhost/api/transaction-templates", "POST", {
        name: "Referência legada",
        type: "EXPENSE",
        categoryId: owner.category.id,
      }),
    );
    const createdBody = await responseBody(created);

    await prisma.category.update({
      where: { id: owner.category.id },
      data: { isActive: false },
    });

    const favoriteOnly = await updateTemplate(
      jsonRequest(
        `http://localhost/api/transaction-templates/${createdBody.data.id}`,
        "PUT",
        { isFavorite: true },
      ),
      context(createdBody.data.id),
    );
    expect(favoriteOnly.status).toBe(200);
  });

  it("paginates a larger catalog instead of depending on an unbounded list", async () => {
    const owner = await createFixture("pagination");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.user.id);

    await prisma.transactionTemplate.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        name: `Modelo ${String(index + 1).padStart(2, "0")}`,
        type: "EXPENSE",
        userId: owner.user.id,
      })),
    });

    const firstPage = await listTemplates(
      new Request(
        "http://localhost/api/transaction-templates?page=1&pageSize=10",
      ),
    );
    const firstBody = await responseBody(firstPage);
    expect(firstBody.data).toMatchObject({
      total: 12,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    });
    expect(firstBody.data.items).toHaveLength(10);

    const secondPage = await listTemplates(
      new Request(
        "http://localhost/api/transaction-templates?page=2&pageSize=10",
      ),
    );
    const secondBody = await responseBody(secondPage);
    expect(secondBody.data.items).toHaveLength(2);
  });
});
