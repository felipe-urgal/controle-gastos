import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => {
  const delegate = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  return {
    delegate,
    getAuthenticatedUserId: vi.fn(),
    prisma: {},
  };
});

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";

const crud = baseCrudHandler({
  model: () => mocks.delegate,
  entityName: "Item",
  createSchema: z.object({}),
  updateSchema: z.object({}),
  filterableFields: ["status"],
});

describe("baseCrudHandler query hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-123");
    mocks.delegate.findMany.mockResolvedValue([]);
    mocks.delegate.count.mockResolvedValue(0);
  });

  it("caps pageSize to a bounded server-side maximum", async () => {
    const response = await crud.list(
      new Request("http://localhost/api/items?page=1&pageSize=10000"),
    );

    expect(response.status).toBe(200);
    expect(mocks.delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, skip: 0 }),
    );
  });

  it("does not coerce enum-like filter values that happen to look numeric", async () => {
    const response = await crud.list(
      new Request("http://localhost/api/items?status=1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ userId: "user-123", status: "1" }],
        },
      }),
    );
  });
});
