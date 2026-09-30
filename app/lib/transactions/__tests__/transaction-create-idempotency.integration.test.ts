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
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function createRequest(
  accountId: string,
  categoryId: string,
  idempotencyKey: string,
  overrides: Record<string, unknown> = {},
) {
  return new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount: 12_345,
      type: "EXPENSE",
      description: "Despesa offline",
      status: "COMPLETED",
      year: 2030,
      month: 6,
      day: 15,
      accountId,
      categoryId,
      ...overrides,
    }),
  });
}

async function setupOwner(name: string) {
  const user = await fixtures.user({ name });
  const [account, category] = await Promise.all([
    fixtures.account(user.id, { name: `${name} Conta`, currency: "BRL" }),
    fixtures.category(user.id, { name: `${name} Categoria`, type: "EXPENSE" }),
  ]);

  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return { user, account, category };
}

describe("normal transaction create idempotency", () => {
  it("replays the same key and payload without duplicating the transaction", async () => {
    const { user, account, category } = await setupOwner("Retry");
    const key = randomUUID();

    const first = await transactionCrud.create(
      createRequest(account.id, category.id, key),
    );
    const replay = await transactionCrud.create(
      createRequest(account.id, category.id, key),
    );

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);

    const firstBody = (await first.json()) as { data: { id: string } };
    const replayBody = (await replay.json()) as { data: { id: string } };
    expect(replayBody.data.id).toBe(firstBody.data.id);

    expect(
      await prisma.transaction.count({
        where: { userId: user.id, kind: "NORMAL" },
      }),
    ).toBe(1);

    const operation = await prisma.transactionCreateOperation.findFirst({
      where: { userId: user.id },
    });
    expect(operation?.transactionId).toBe(firstBody.data.id);
    expect(operation?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(operation?.idempotencyKeyHash).not.toBe(key);
    expect(operation?.requestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects reusing a key with a different payload", async () => {
    const { user, account, category } = await setupOwner("Conflict");
    const key = randomUUID();

    const first = await transactionCrud.create(
      createRequest(account.id, category.id, key),
    );
    const conflict = await transactionCrud.create(
      createRequest(account.id, category.id, key, { amount: 99_999 }),
    );

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: { code: "IDEMPOTENCY_PAYLOAD_CONFLICT" },
    });
    expect(
      await prisma.transaction.count({
        where: { userId: user.id, kind: "NORMAL" },
      }),
    ).toBe(1);
    expect(
      await prisma.transactionCreateOperation.count({
        where: { userId: user.id },
      }),
    ).toBe(1);
  });

  it("collapses concurrent retries into one persisted transaction", async () => {
    const { user, account, category } = await setupOwner("Concurrent");
    const key = randomUUID();

    const responses = await Promise.all([
      transactionCrud.create(createRequest(account.id, category.id, key)),
      transactionCrud.create(createRequest(account.id, category.id, key)),
    ]);
    const bodies = await Promise.all(
      responses.map((response) => response.json() as Promise<{ data: { id: string } }>),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(new Set(bodies.map((body) => body.data.id)).size).toBe(1);
    expect(
      await prisma.transaction.count({
        where: { userId: user.id, kind: "NORMAL" },
      }),
    ).toBe(1);
    expect(
      await prisma.transactionCreateOperation.count({
        where: { userId: user.id },
      }),
    ).toBe(1);
  });

  it("keeps the key reserved after the created transaction is deleted", async () => {
    const { user, account, category } = await setupOwner("Deleted");
    const key = randomUUID();

    const created = await transactionCrud.create(
      createRequest(account.id, category.id, key),
    );
    const createdBody = (await created.json()) as { data: { id: string } };

    const removed = await transactionCrud.remove(
      new Request(
        `http://localhost/api/transactions/${createdBody.data.id}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: createdBody.data.id }) },
    );
    expect(removed.status).toBe(200);

    const retry = await transactionCrud.create(
      createRequest(account.id, category.id, key),
    );

    expect(retry.status).toBe(409);
    expect(await retry.json()).toMatchObject({
      error: { code: "IDEMPOTENCY_OPERATION_REMOVED" },
    });
    expect(
      await prisma.transaction.count({
        where: { userId: user.id, kind: "NORMAL" },
      }),
    ).toBe(0);
    expect(
      await prisma.transactionCreateOperation.findFirst({
        where: { userId: user.id },
      }),
    ).toMatchObject({ transactionId: null });
  });
});
