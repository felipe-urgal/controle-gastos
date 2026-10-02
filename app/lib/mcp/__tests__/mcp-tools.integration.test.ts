import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  executeMcpTool,
  parseMcpToolArguments,
} from "@/app/lib/mcp/mcp-tools";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

async function createFixture() {
  const suffix = randomUUID();
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: {
        name: "MCP Tool Owner",
        email: `mcp-tool-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "MCP Tool Other",
        email: `mcp-tool-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, other.id);

  const [ownerBrl, ownerUsd, otherAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Owner BRL",
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Owner USD",
        type: "CREDIT_DEBIT",
        currency: "USD",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Other BRL",
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: other.id,
      },
    }),
  ]);

  const [ownerIncome, otherIncome] = await Promise.all([
    prisma.category.create({
      data: { name: "Receita MCP", type: "INCOME", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: "Receita MCP Other", type: "INCOME", userId: other.id },
    }),
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        amount: 100_000,
        year: 2026,
        month: 9,
        day: 10,
        type: "INCOME",
        description: "Salário owner",
        status: "COMPLETED",
        accountId: ownerBrl.id,
        categoryId: ownerIncome.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2026,
        month: 9,
        day: 11,
        type: "INCOME",
        description: "Receita dólar owner",
        status: "COMPLETED",
        accountId: ownerUsd.id,
        categoryId: ownerIncome.id,
        userId: owner.id,
      },
      {
        amount: 999_999,
        year: 2026,
        month: 9,
        day: 12,
        type: "INCOME",
        description: "Segredo other",
        status: "COMPLETED",
        accountId: otherAccount.id,
        categoryId: otherIncome.id,
        userId: other.id,
      },
    ],
  });

  return { owner, other, ownerBrl, ownerUsd, otherAccount };
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

describe("MCP read-only tools", () => {
  it("lista apenas contas do principal e mantém moedas separadas", async () => {
    const fixture = await createFixture();

    const result = await executeMcpTool(
      fixture.owner.id,
      "get_accounts",
      { includeInactive: false },
    );
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: fixture.ownerBrl.id,
          currency: "BRL",
          balance: 100_000,
        }),
        expect.objectContaining({
          id: fixture.ownerUsd.id,
          currency: "USD",
          balance: 20_000,
        }),
      ]),
    });
    expect(serialized).not.toContain(fixture.otherAccount.id);
    expect(serialized).not.toContain("999999");
  });

  it("busca transações somente do principal e respeita paginação", async () => {
    const fixture = await createFixture();

    const result = await executeMcpTool(
      fixture.owner.id,
      "search_transactions",
      {
        year: 2026,
        month: 9,
        page: 1,
        limit: 1,
      },
    );
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      period: { year: 2026, month: 9 },
      page: 1,
      limit: 1,
      hasMore: true,
      items: [expect.objectContaining({ description: expect.stringContaining("owner") })],
    });
    expect(serialized).not.toContain("Segredo other");
    expect(serialized).not.toContain(fixture.otherAccount.id);
  });

  it("limita range e tamanho de resposta nos schemas", () => {
    expect(() =>
      parseMcpToolArguments("search_transactions", {
        year: 2026,
        month: 9,
        page: 1,
        limit: 51,
      }),
    ).toThrow();

    expect(() =>
      parseMcpToolArguments("search_transactions", {
        year: 2026,
        month: 9,
        page: 21,
        limit: 20,
      }),
    ).toThrow();

    expect(() =>
      parseMcpToolArguments("get_net_worth", {
        year: 2026,
        month: 9,
        months: 25,
      }),
    ).toThrow();
  });
});
