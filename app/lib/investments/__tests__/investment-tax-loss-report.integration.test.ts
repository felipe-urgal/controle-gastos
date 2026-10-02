import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  createInvestmentTaxLossAdjustment,
  getInvestmentTaxLossReportForUser,
} from "@/app/lib/investments/investment-tax-loss-report";
import { prisma } from "@/app/lib/prisma";

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

const authMock = vi.mocked(getAuthenticatedUserId);
const userIds: string[] = [];

async function user(name: string) {
  const created = await prisma.user.create({
    data: {
      name,
      email: `tax-loss-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(created.id);
  return created;
}

describe("investment tax loss report integration", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    vi.clearAllMocks();
  });

  it("persists an auditable manual opening balance", async () => {
    const owner = await user("Tax Loss Owner");
    authMock.mockResolvedValue(owner.id);

    const response = await createInvestmentTaxLossAdjustment(
      new Request("http://localhost/api/investments/tax-losses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: "FII",
          currency: "BRL",
          amountCents: 12_345,
          year: 2026,
          month: 1,
          reason: "Saldo declarado do ano anterior",
        }),
      }),
    );

    expect(response.status).toBe(201);

    const report = await getInvestmentTaxLossReportForUser(owner.id, 2026);
    expect(report.rows[0]).toMatchObject({
      assetType: "FII",
      currency: "BRL",
      openingLossCents: 12_345,
      closingLossCents: 12_345,
      adjustment: {
        amountCents: 12_345,
        reason: "Saldo declarado do ano anterior",
      },
    });
  });

  it("keeps adjustments isolated by ownership", async () => {
    const [owner, other] = await Promise.all([
      user("Tax Loss Owner"),
      user("Tax Loss Other"),
    ]);

    await prisma.investmentTaxLossAdjustment.create({
      data: {
        userId: other.id,
        assetType: "FII",
        currency: "BRL",
        amountCents: 99_999,
        year: 2026,
        month: 1,
        reason: "Outro usuário",
      },
    });

    const report = await getInvestmentTaxLossReportForUser(owner.id, 2026);

    expect(report.rows).toEqual([]);
    expect(report.adjustments).toEqual([]);
  });
});
