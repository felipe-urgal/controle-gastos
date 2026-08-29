import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => {
  const account = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  return {
    getAuthenticatedUserId: vi.fn(),
    account,
    prisma: {
      account,
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

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";

const createSchema = z.object({ name: z.string() });
const updateSchema = createSchema.partial();

function createHandler() {
  return baseCrudHandler({
    model: (db) => db.account,
    entityName: "Conta",
    createSchema,
    updateSchema,
    afterRead: async (entity) => ({ ...entity, balance: 1234 }),
    mapper: (entity) => ({ id: entity.id, name: entity.name, balance: entity.balance }),
  });
}

describe("baseCrudHandler afterRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
  });

  it("enriches create responses before mapping", async () => {
    mocks.account.create.mockResolvedValue({ id: "account-1", name: "Conta" });

    const response = await createHandler().create(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify({ name: "Conta" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual({ id: "account-1", name: "Conta", balance: 1234 });
  });

  it("enriches getById responses before mapping", async () => {
    mocks.account.findFirst.mockResolvedValue({ id: "account-1", name: "Conta" });

    const response = await createHandler().getById(
      new Request("http://localhost/api/accounts/account-1"),
      { params: Promise.resolve({ id: "account-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "account-1", name: "Conta", balance: 1234 });
  });

  it("enriches update responses before mapping", async () => {
    mocks.account.findFirst.mockResolvedValue({ id: "account-1", name: "Conta" });
    mocks.account.update.mockResolvedValue({ id: "account-1", name: "Renomeada" });

    const response = await createHandler().update(
      new Request("http://localhost/api/accounts/account-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Renomeada" }),
      }),
      { params: Promise.resolve({ id: "account-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      id: "account-1",
      name: "Renomeada",
      balance: 1234,
    });
  });
});
