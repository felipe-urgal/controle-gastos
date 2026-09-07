import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { prisma } from "@/app/lib/prisma";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import type { CreateTransferInput } from "@/app/schemas/transfer.schema";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `transfer-create-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function input(
  sourceAccountId: string,
  destinationAccountId: string,
  overrides: Partial<CreateTransferInput> = {},
): CreateTransferInput {
  return {
    sourceAccountId,
    destinationAccountId,
    amountCents: 12_345,
    year: 2030,
    month: 2,
    day: 15,
    description: "Reserva mensal",
    status: "COMPLETED",
    ...overrides,
  };
}

describe("createTransferForUser", () => {
  it("creates exactly two linked legs atomically and updates derived balances", async () => {
    const owner = await createUser("Owner");
    const [source, destination] = await Promise.all([
      prisma.account.create({ data: { name: "Origem", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "Destino", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
    ]);
    const idempotencyKey = randomUUID();

    const result = await createTransferForUser(
      owner.id,
      input(source.id, destination.id),
      idempotencyKey,
    );
    const legs = await prisma.transaction.findMany({
      where: { transferId: result.id },
      orderBy: { transferRole: "desc" },
    });
    const persisted = await prisma.transfer.findUnique({ where: { id: result.id } });

    expect(result.replayed).toBe(false);
    expect(legs).toHaveLength(2);
    expect(legs.every((leg) => leg.kind === "TRANSFER" && leg.categoryId === null)).toBe(true);
    expect(new Set(legs.map((leg) => leg.transferRole))).toEqual(new Set(["SOURCE", "DESTINATION"]));
    expect(legs.every((leg) => leg.amount === 12_345 && leg.status === "COMPLETED")).toBe(true);
    expect(persisted?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted?.idempotencyKeyHash).not.toBe(idempotencyKey);
    expect(persisted?.requestHash).toMatch(/^[a-f0-9]{64}$/);

    await expect(withDerivedAccountBalance(source, owner.id)).resolves.toMatchObject({ balance: -12_345 });
    await expect(withDerivedAccountBalance(destination, owner.id)).resolves.toMatchObject({ balance: 12_345 });
  });

  it("replays the same operation without creating another transfer or legs", async () => {
    const owner = await createUser("Retry owner");
    const [source, destination] = await Promise.all([
      prisma.account.create({ data: { name: "Retry origem", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "Retry destino", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
    ]);
    const idempotencyKey = randomUUID();
    const payload = input(source.id, destination.id);

    const first = await createTransferForUser(owner.id, payload, idempotencyKey);
    const replay = await createTransferForUser(owner.id, payload, idempotencyKey);

    expect(first.replayed).toBe(false);
    expect(replay).toMatchObject({
      id: first.id,
      sourceTransactionId: first.sourceTransactionId,
      destinationTransactionId: first.destinationTransactionId,
      replayed: true,
    });
    expect(await prisma.transfer.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(2);
  });

  it("rejects reusing a key with a different payload without partial rows", async () => {
    const owner = await createUser("Conflict owner");
    const [source, destination] = await Promise.all([
      prisma.account.create({ data: { name: "Conflict origem", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "Conflict destino", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
    ]);
    const idempotencyKey = randomUUID();

    await createTransferForUser(
      owner.id,
      input(source.id, destination.id),
      idempotencyKey,
    );

    await expect(
      createTransferForUser(
        owner.id,
        input(source.id, destination.id, { amountCents: 99_999 }),
        idempotencyKey,
      ),
    ).rejects.toThrow("Chave de idempotência já utilizada com outro payload");

    expect(await prisma.transfer.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(2);
  });

  it("scopes the same idempotency key by authenticated user", async () => {
    const firstOwner = await createUser("First owner");
    const secondOwner = await createUser("Second owner");
    const [firstSource, firstDestination, secondSource, secondDestination] = await Promise.all([
      prisma.account.create({ data: { name: "First origem", type: "CREDIT_DEBIT", currency: "BRL", userId: firstOwner.id } }),
      prisma.account.create({ data: { name: "First destino", type: "CREDIT_DEBIT", currency: "BRL", userId: firstOwner.id } }),
      prisma.account.create({ data: { name: "Second origem", type: "CREDIT_DEBIT", currency: "BRL", userId: secondOwner.id } }),
      prisma.account.create({ data: { name: "Second destino", type: "CREDIT_DEBIT", currency: "BRL", userId: secondOwner.id } }),
    ]);
    const sharedKey = randomUUID();

    const [first, second] = await Promise.all([
      createTransferForUser(firstOwner.id, input(firstSource.id, firstDestination.id), sharedKey),
      createTransferForUser(secondOwner.id, input(secondSource.id, secondDestination.id), sharedKey),
    ]);

    expect(first.id).not.toBe(second.id);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(false);
    expect(await prisma.transfer.count({ where: { id: { in: [first.id, second.id] } } })).toBe(2);
  });

  it("collapses concurrent retries into one persisted operation", async () => {
    const owner = await createUser("Concurrent owner");
    const [source, destination] = await Promise.all([
      prisma.account.create({ data: { name: "Concurrent origem", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "Concurrent destino", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
    ]);
    const idempotencyKey = randomUUID();
    const payload = input(source.id, destination.id);

    const results = await Promise.all([
      createTransferForUser(owner.id, payload, idempotencyKey),
      createTransferForUser(owner.id, payload, idempotencyKey),
    ]);

    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    expect(await prisma.transfer.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(2);
  });

  it("rejects same-account, cross-currency and foreign-account attempts without partial rows", async () => {
    const owner = await createUser("Owner");
    const foreign = await createUser("Foreign");
    const [brl, usd, foreignBrl] = await Promise.all([
      prisma.account.create({ data: { name: "BRL", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "USD", type: "CREDIT_DEBIT", currency: "USD", userId: owner.id } }),
      prisma.account.create({ data: { name: "Foreign", type: "CREDIT_DEBIT", currency: "BRL", userId: foreign.id } }),
    ]);

    await expect(
      createTransferForUser(owner.id, input(brl.id, brl.id), randomUUID()),
    ).rejects.toThrow("devem ser diferentes");
    await expect(
      createTransferForUser(owner.id, input(brl.id, usd.id), randomUUID()),
    ).rejects.toThrow("moedas diferentes");
    await expect(
      createTransferForUser(owner.id, input(brl.id, foreignBrl.id), randomUUID()),
    ).rejects.toThrow("Conta inválida ou inativa");

    expect(await prisma.transfer.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(0);
  });
});
