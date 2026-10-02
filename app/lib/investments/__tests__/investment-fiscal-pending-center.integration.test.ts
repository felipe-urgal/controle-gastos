import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  getFiscalPendingCenterForUser,
  justifyFiscalPending,
} from "@/app/lib/investments/investment-fiscal-pending-center";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

const authMock = vi.mocked(getAuthenticatedUserId);
const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `pending-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createIncome(args: {
  userId: string;
  year: number;
  type?: "INCOME" | "OTHER";
}) {
  const account = await prisma.account.create({
    data: {
      name: `Broker ${randomUUID()}`,
      type: "INVESTMENT",
      currency: "BRL",
      userId: args.userId,
    },
  });
  const asset = await prisma.investmentAsset.create({
    data: {
      symbol: `T${randomUUID().slice(0, 5).toUpperCase()}`,
      type: "FII",
      currency: "BRL",
      market: "B3",
      userId: args.userId,
    },
  });
  const income = await prisma.investmentIncome.create({
    data: {
      type: args.type ?? "INCOME",
      quantityUnits: parseInvestmentQuantity("10")!,
      unitValueCents: 10,
      netAmountCents: 100,
      year: args.year,
      month: 1,
      day: 10,
      userId: args.userId,
      accountId: account.id,
      assetId: asset.id,
    },
  });
  return { account, asset, income };
}

describe("fiscal pending center integration", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    vi.clearAllMocks();
  });

  it("generates a fiscal pending item and allows an auditable justification", async () => {
    const owner = await createUser("Pending Owner");
    await createIncome({ userId: owner.id, year: 2026 });

    const before = await getFiscalPendingCenterForUser(owner.id, 2026);
    expect(before.status).toBe("INCOMPLETE");
    expect(before.summary.active).toBe(1);
    expect(before.items[0]).toMatchObject({
      category: "INCOME_CLASSIFICATION",
      status: "ACTIVE",
    });

    authMock.mockResolvedValue(owner.id);
    const response = await justifyFiscalPending(
      new Request("http://localhost/api/investments/fiscal-pendencies/justify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          fingerprint: before.items[0]?.fingerprint,
          justification:
            "Documento da fonte pagadora não fornece classificação adicional.",
        }),
      }),
    );
    expect(response.status).toBe(201);

    const after = await getFiscalPendingCenterForUser(owner.id, 2026);
    expect(after.status).toBe("COMPLETE_WITH_JUSTIFICATIONS");
    expect(after.summary.justified).toBe(1);
    expect(after.items[0]?.status).toBe("JUSTIFIED");
    expect(after.resolutionHistory[0]?.applied).toBe(true);
  });

  it("reopens the issue when underlying data changes and fingerprint changes", async () => {
    const owner = await createUser("Reopen Owner");
    const { income } = await createIncome({ userId: owner.id, year: 2026 });

    const initial = await getFiscalPendingCenterForUser(owner.id, 2026);
    authMock.mockResolvedValue(owner.id);
    await justifyFiscalPending(
      new Request("http://localhost/api/investments/fiscal-pendencies/justify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          fingerprint: initial.items[0]?.fingerprint,
          justification: "Classificação aceita com base no documento disponível.",
        }),
      }),
    );

    await prisma.investmentIncome.update({
      where: { id: income.id },
      data: { type: "OTHER" },
    });

    const changed = await getFiscalPendingCenterForUser(owner.id, 2026);
    expect(changed.status).toBe("INCOMPLETE");
    expect(changed.items[0]?.status).toBe("ACTIVE");
    expect(changed.items[0]?.fingerprint).not.toBe(
      initial.items[0]?.fingerprint,
    );
    expect(changed.resolutionHistory).toEqual(
      expect.arrayContaining([expect.objectContaining({ applied: false })]),
    );
  });

  it("isolates pendencies and justifications by owner and year", async () => {
    const [owner, other] = await Promise.all([
      createUser("Pending Owner"),
      createUser("Pending Other"),
    ]);
    await createIncome({ userId: owner.id, year: 2025 });
    await createIncome({ userId: owner.id, year: 2026 });
    await createIncome({ userId: other.id, year: 2026 });

    const report2025 = await getFiscalPendingCenterForUser(owner.id, 2025);
    const report2026 = await getFiscalPendingCenterForUser(owner.id, 2026);

    expect(report2025.items).toHaveLength(1);
    expect(report2026.items).toHaveLength(1);

    authMock.mockResolvedValue(other.id);
    const forbidden = await justifyFiscalPending(
      new Request("http://localhost/api/investments/fiscal-pendencies/justify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          fingerprint: report2026.items[0]?.fingerprint,
          justification: "Tentativa de justificar pendência de outro usuário.",
        }),
      }),
    );

    expect(forbidden.status).toBe(409);
    expect(
      await prisma.investmentFiscalPendingResolution.count({
        where: { userId: other.id },
      }),
    ).toBe(0);
  });
});
