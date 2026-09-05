import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { prisma } from "@/app/lib/prisma";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";

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

function input(sourceAccountId: string, destinationAccountId: string) {
  return {
    sourceAccountId,
    destinationAccountId,
    amountCents: 12_345,
    year: 2030,
    month: 2,
    day: 15,
    description: "Reserva mensal",
    status: "COMPLETED" as const,
  };
}

describe("createTransferForUser", () => {
  it("creates exactly two linked legs atomically and updates derived balances", async () => {
    const owner = await createUser("Owner");
    const [source, destination] = await Promise.all([
      prisma.account.create({ data: { name: "Origem", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "Destino", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
    ]);

    const result = await createTransferForUser(owner.id, input(source.id, destination.id));
    const legs = await prisma.transaction.findMany({
      where: { transferId: result.id },
      orderBy: { transferRole: "desc" },
    });

    expect(legs).toHaveLength(2);
    expect(legs.every((leg) => leg.kind === "TRANSFER" && leg.categoryId === null)).toBe(true);
    expect(new Set(legs.map((leg) => leg.transferRole))).toEqual(new Set(["SOURCE", "DESTINATION"]));
    expect(legs.every((leg) => leg.amount === 12_345 && leg.status === "COMPLETED")).toBe(true);

    await expect(withDerivedAccountBalance(source, owner.id)).resolves.toMatchObject({ balance: -12_345 });
    await expect(withDerivedAccountBalance(destination, owner.id)).resolves.toMatchObject({ balance: 12_345 });
  });

  it("rejects same-account, cross-currency and foreign-account attempts without partial rows", async () => {
    const owner = await createUser("Owner");
    const foreign = await createUser("Foreign");
    const [brl, usd, foreignBrl] = await Promise.all([
      prisma.account.create({ data: { name: "BRL", type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id } }),
      prisma.account.create({ data: { name: "USD", type: "CREDIT_DEBIT", currency: "USD", userId: owner.id } }),
      prisma.account.create({ data: { name: "Foreign", type: "CREDIT_DEBIT", currency: "BRL", userId: foreign.id } }),
    ]);

    await expect(createTransferForUser(owner.id, input(brl.id, brl.id))).rejects.toThrow("devem ser diferentes");
    await expect(createTransferForUser(owner.id, input(brl.id, usd.id))).rejects.toThrow("moedas diferentes");
    await expect(createTransferForUser(owner.id, input(brl.id, foreignBrl.id))).rejects.toThrow("Conta inválida ou inativa");

    expect(await prisma.transfer.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(0);
  });
});
