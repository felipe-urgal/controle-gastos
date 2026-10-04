import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  applyAnnualFinancialStatementBaseline,
  confirmAnnualFinancialTaxStatement,
} from "@/app/lib/investments/annual-financial-statement-import";
import {
  annualFinancialStatementFingerprint,
  type ParsedAnnualFinancialTaxStatement,
} from "@/app/lib/investments/annual-financial-statement-parser";
import { signAnnualFinancialStatementPreview } from "@/app/lib/investments/annual-financial-statement-preview-token";
import { getAnnualFinancialStatementReconciliationForUser } from "@/app/lib/investments/annual-financial-statement-reconciliation";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

process.env.JWT_SECRET ||= "annual-financial-statement-test-secret";

const userIds: string[] = [];

function fingerprint() {
  return randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64);
}

async function createUser(name = "Annual Financial Test") {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name,
      email: "annual-financial-" + suffix + "@example.com",
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

function parsedStatement(overrides?: Partial<ParsedAnnualFinancialTaxStatement>) {
  return {
    calendarYear: 2025,
    sourceInstitution: "Nubank",
    sourceInstitutionCnpj: "18.236.120/0001-58",
    documentType: "NUBANK_ANNUAL_FINANCIAL_STATEMENT" as const,
    positions: [
      {
        type: "FII" as const,
        symbol: "MXRF11",
        description: "MXRF11",
        currency: "BRL" as const,
        previousYearQuantity: "2000",
        currentYearQuantity: "2100",
        previousYearCostCents: null,
        currentYearCostCents: 210000,
        previousYearBalanceCents: null,
        currentYearBalanceCents: null,
        sourceInstitution: "Nubank",
        sourceInstitutionCnpj: "18.236.120/0001-58",
        category: "Bens e Direitos",
      },
    ],
    incomes: [
      {
        symbol: "MXRF11",
        description: "Rendimentos isentos",
        incomeType: "DIVIDEND" as const,
        currency: "BRL" as const,
        amountCents: 84000,
        payerName: null,
        payerCnpj: null,
        category: "Rendimentos isentos",
      },
    ],
    taxWithholdings: [],
    notes: [],
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request("http://localhost" + url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createInternalInvestment(args: {
  userId: string;
  symbol?: string;
  type?: "FII" | "CRYPTO";
  quantity?: string;
  unitPriceCents?: number;
  incomeCents?: number | null;
  fiscalType?: "BUY" | "CUSTODY_TRANSFER_IN";
}) {
  const quantity = args.quantity ?? "2100";
  const quantityUnits = parseInvestmentQuantity(quantity);
  if (quantityUnits === null) throw new Error("invalid test quantity");

  const account = await prisma.account.create({
    data: {
      name: "Nubank " + randomUUID(),
      type: "INVESTMENT",
      currency: "BRL",
      userId: args.userId,
    },
  });
  const asset = await prisma.investmentAsset.create({
    data: {
      symbol: args.symbol ?? "MXRF11",
      type: args.type ?? "FII",
      currency: "BRL",
      market: args.type === "CRYPTO" ? null : "B3",
      userId: args.userId,
    },
  });
  const operation = await prisma.investmentOperation.create({
    data: {
      userId: args.userId,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantityUnits,
      unitPriceCents: args.unitPriceCents ?? 100,
      feesCents: 0,
      year: 2025,
      month: 1,
      day: 10,
    },
  });
  await prisma.investmentFiscalEvent.create({
    data: {
      userId: args.userId,
      accountId: account.id,
      assetId: asset.id,
      operationId: operation.id,
      type: args.fiscalType ?? "BUY",
      originalType: "BUY",
      classificationSource:
        args.fiscalType === "CUSTODY_TRANSFER_IN" ? "USER" : "SYSTEM",
      quantityUnits,
      year: 2025,
      month: 1,
      day: 10,
      destinationInstitution:
        args.fiscalType === "CUSTODY_TRANSFER_IN" ? "Nubank" : null,
      reclassificationNote:
        args.fiscalType === "CUSTODY_TRANSFER_IN"
          ? "Transferência de custódia para teste"
          : null,
    },
  });

  if (args.incomeCents !== null) {
    await prisma.investmentIncome.create({
      data: {
        userId: args.userId,
        accountId: account.id,
        assetId: asset.id,
        type: "DIVIDEND",
        quantityUnits,
        unitValueCents: 40,
        netAmountCents: args.incomeCents ?? 84000,
        year: 2025,
        month: 6,
        day: 15,
      },
    });
  }

  return { account, asset, operation };
}

async function persistStatement(
  userId: string,
  statement: ParsedAnnualFinancialTaxStatement,
) {
  return prisma.annualFinancialTaxStatement.create({
    data: {
      userId,
      calendarYear: statement.calendarYear,
      sourceInstitution: statement.sourceInstitution,
      sourceInstitutionCnpj: statement.sourceInstitutionCnpj,
      documentType: statement.documentType,
      positions: statement.positions,
      incomes: statement.incomes,
      taxWithholdings: statement.taxWithholdings,
      notes: statement.notes,
      warnings: statement.warnings,
      importFingerprint: fingerprint(),
    },
  });
}

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("annual financial statement import and reconciliation", () => {
  it("imports idempotently without creating operations or incomes", async () => {
    const user = await createUser();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const base = parsedStatement();
    const statement = {
      ...base,
      fingerprint: annualFinancialStatementFingerprint(user.id, base),
      duplicate: false,
    };
    const previewToken = signAnnualFinancialStatementPreview(user.id, statement);

    const first = await confirmAnnualFinancialTaxStatement(
      jsonRequest("/api/investments/annual-statements/confirm", {
        previewToken,
        selected: true,
        statement,
      }),
    );
    expect(first.status).toBe(201);

    const second = await confirmAnnualFinancialTaxStatement(
      jsonRequest("/api/investments/annual-statements/confirm", {
        previewToken,
        selected: true,
        statement,
      }),
    );
    expect(second.status).toBe(200);
    expect(
      await prisma.annualFinancialTaxStatement.count({
        where: { userId: user.id },
      }),
    ).toBe(1);
    expect(
      await prisma.investmentOperation.count({ where: { userId: user.id } }),
    ).toBe(0);
    expect(
      await prisma.investmentIncome.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it("rejects a preview signed for another owner", async () => {
    const owner = await createUser("Owner");
    const other = await createUser("Other");
    const base = parsedStatement();
    const statement = {
      ...base,
      fingerprint: annualFinancialStatementFingerprint(owner.id, base),
      duplicate: false,
    };
    const previewToken = signAnnualFinancialStatementPreview(owner.id, statement);

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const response = await confirmAnnualFinancialTaxStatement(
      jsonRequest("/api/investments/annual-statements/confirm", {
        previewToken,
        selected: true,
        statement,
      }),
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.annualFinancialTaxStatement.count({
        where: { userId: other.id },
      }),
    ).toBe(0);
  });

  it("matches fiscal position and annual income when values agree", async () => {
    const user = await createUser();
    await createInternalInvestment({ userId: user.id });
    await persistStatement(user.id, parsedStatement());

    const report = await getAnnualFinancialStatementReconciliationForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("MATCHED");
    expect(report.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "MXRF11",
          status: "MATCHED",
          internalQuantity: "2100",
          statementQuantity: "2100",
          internalCostCents: 210000,
          statementCostCents: 210000,
        }),
      ]),
    );
    expect(report.incomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "MXRF11",
          status: "MATCHED",
          internalAmountCents: 84000,
          statementAmountCents: 84000,
        }),
      ]),
    );
  });

  it("keeps quantity and income mismatches explicit", async () => {
    const user = await createUser();
    await createInternalInvestment({ userId: user.id });

    const statement = parsedStatement({
      positions: [
        {
          ...parsedStatement().positions[0]!,
          currentYearQuantity: "2000",
          currentYearCostCents: 200000,
        },
      ],
      incomes: [
        {
          ...parsedStatement().incomes[0]!,
          amountCents: 80000,
        },
      ],
    });
    await persistStatement(user.id, statement);

    const report = await getAnnualFinancialStatementReconciliationForUser(
      user.id,
      2025,
    );

    expect(report.positions[0]).toMatchObject({
      symbol: "MXRF11",
      status: "MISMATCH",
      quantityDifference: "100",
      costDifferenceCents: 10000,
    });
    expect(report.incomes[0]).toMatchObject({
      symbol: "MXRF11",
      status: "MISMATCH",
      differenceCents: 4000,
    });
  });

  it("reports items present only on one side without fabricating values", async () => {
    const user = await createUser();
    await createInternalInvestment({ userId: user.id });
    await persistStatement(
      user.id,
      parsedStatement({
        positions: [
          {
            ...parsedStatement().positions[0]!,
            symbol: "VGIR11",
            description: "VGIR11",
            currentYearQuantity: "175",
            currentYearCostCents: null,
          },
        ],
        incomes: [
          {
            ...parsedStatement().incomes[0]!,
            symbol: "VGIR11",
            description: "VGIR11 rendimentos",
            amountCents: 10000,
          },
        ],
      }),
    );

    const report = await getAnnualFinancialStatementReconciliationForUser(
      user.id,
      2025,
    );

    expect(report.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "VGIR11",
          status: "MISSING_INTERNAL",
        }),
        expect.objectContaining({
          symbol: "MXRF11",
          status: "MISSING_STATEMENT_DATA",
          statementQuantity: null,
        }),
      ]),
    );
    expect(report.incomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "VGIR11",
          status: "MISSING_INTERNAL",
        }),
        expect.objectContaining({
          symbol: "MXRF11",
          status: "MISSING_STATEMENT_DATA",
          statementAmountCents: null,
        }),
      ]),
    );
  });

  it("applies an explicit statement cost as an idempotent fiscal baseline", async () => {
    const user = await createUser();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
    await createInternalInvestment({
      userId: user.id,
      symbol: "QNT",
      type: "CRYPTO",
      quantity: "0.12041",
      unitPriceCents: 50000,
      incomeCents: null,
      fiscalType: "CUSTODY_TRANSFER_IN",
    });

    const statement = await persistStatement(
      user.id,
      parsedStatement({
        positions: [
          {
            ...parsedStatement().positions[0]!,
            type: "CRYPTO",
            symbol: "QNT",
            description: "QNT",
            previousYearQuantity: null,
            currentYearQuantity: "0.12041",
            currentYearCostCents: 6000,
          },
        ],
        incomes: [],
      }),
    );

    const before = await getAnnualFinancialStatementReconciliationForUser(
      user.id,
      2025,
    );
    expect(before.positions[0]).toMatchObject({
      symbol: "QNT",
      status: "MISMATCH",
      canApplyBaseline: true,
    });

    const first = await applyAnnualFinancialStatementBaseline(
      jsonRequest("/api/investments/annual-statements/baseline", {
        statementId: statement.id,
        positionIndex: 0,
      }),
    );
    expect(first.status).toBe(201);

    const second = await applyAnnualFinancialStatementBaseline(
      jsonRequest("/api/investments/annual-statements/baseline", {
        statementId: statement.id,
        positionIndex: 0,
      }),
    );
    expect(second.status).toBe(200);
    expect(
      await prisma.investmentFiscalCostAdjustment.count({
        where: { userId: user.id },
      }),
    ).toBe(1);

    const after = await getAnnualFinancialStatementReconciliationForUser(
      user.id,
      2025,
    );
    expect(after.positions[0]).toMatchObject({
      symbol: "QNT",
      status: "MATCHED",
      internalQuantity: "0.12041",
      internalCostCents: 6000,
    });
  });

  it("never applies another user's statement baseline", async () => {
    const owner = await createUser("Owner");
    const other = await createUser("Other");
    const statement = await persistStatement(
      owner.id,
      parsedStatement({
        positions: [
          {
            ...parsedStatement().positions[0]!,
            type: "CRYPTO",
            symbol: "QNT",
            description: "QNT",
            currentYearQuantity: "0.12041",
            currentYearCostCents: 6000,
          },
        ],
        incomes: [],
      }),
    );

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const response = await applyAnnualFinancialStatementBaseline(
      jsonRequest("/api/investments/annual-statements/baseline", {
        statementId: statement.id,
        positionIndex: 0,
      }),
    );

    expect(response.status).toBe(404);
    expect(
      await prisma.investmentFiscalCostAdjustment.count({
        where: { userId: other.id },
      }),
    ).toBe(0);
  });
});
