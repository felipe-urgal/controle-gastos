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
  });
}

describe("baseCrudHandler ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
  });

  it("binds created entities to the authenticated user", async () => {
    mocks.account.create.mockResolvedValue({
      id: "account-1",
      name: "Conta",
      userId: "user-1",
    });

    await createHandler().create(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify({ name: "Conta" }),
      })
    );

    expect(mocks.account.create).toHaveBeenCalledWith({
      data: { name: "Conta", userId: "user-1" },
      include: undefined,
    });
  });

  it("checks and enforces ownership in update", async () => {
    mocks.account.findFirst.mockResolvedValue({
      id: "account-1",
      name: "Conta",
      userId: "user-1",
    });
    mocks.account.update.mockResolvedValue({
      id: "account-1",
      name: "Renomeada",
      userId: "user-1",
    });

    await createHandler().update(
      new Request("http://localhost/api/accounts/account-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Renomeada" }),
      }),
      { params: Promise.resolve({ id: "account-1" }) }
    );

    expect(mocks.account.findFirst).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
    });
    expect(mocks.account.update).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
      data: { name: "Renomeada" },
      include: undefined,
    });
  });

  it("does not update an entity outside the authenticated user scope", async () => {
    mocks.account.findFirst.mockResolvedValue(null);

    const response = await createHandler().update(
      new Request("http://localhost/api/accounts/account-2", {
        method: "PUT",
        body: JSON.stringify({ name: "Outra" }),
      }),
      { params: Promise.resolve({ id: "account-2" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.account.update).not.toHaveBeenCalled();
  });

  it("checks and enforces ownership in delete", async () => {
    mocks.account.findFirst.mockResolvedValue({
      id: "account-1",
      name: "Conta",
      userId: "user-1",
    });
    mocks.account.delete.mockResolvedValue({ id: "account-1" });

    await createHandler().remove(
      new Request("http://localhost/api/accounts/account-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "account-1" }) }
    );

    expect(mocks.account.findFirst).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
      include: undefined,
    });
    expect(mocks.account.delete).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
    });
  });
});
