import { Prisma } from "@prisma/client";
import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import type {
  ParsedAnnualFinancialStatementIncome,
  ParsedAnnualFinancialStatementPosition,
  ParsedAnnualFinancialStatementTaxWithholding,
} from "@/app/lib/investments/annual-financial-statement-parser";
import { getInvestmentAnnualIncomeReportForUser } from "@/app/lib/investments/investment-annual-income-report";
import { getInvestmentFiscalYearEndSnapshotForUser } from "@/app/lib/investments/investment-fiscal-snapshot";
import {
  formatInvestmentQuantity,
  INVESTMENT_QUANTITY_SCALE,
} from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type AnnualStatementReconciliationStatus =
  | "MATCHED"
  | "MISMATCH"
  | "MISSING_INTERNAL"
  | "MISSING_STATEMENT_DATA"
  | "REVIEW_REQUIRED";

type StoredStatement = Awaited<
  ReturnType<typeof readAnnualFinancialStatements>
>[number];

type PositionReconciliationItem = {
  statementId: string | null;
  positionIndex: number | null;
  sourceInstitution: string | null;
  sourceInstitutionCnpj: string | null;
  description: string;
  type: string;
  symbol: string | null;
  currency: string;
  internalAssetId: string | null;
  internalAssetType: string | null;
  status: AnnualStatementReconciliationStatus;
  reason: string | null;
  statementQuantity: string | null;
  internalQuantity: string | null;
  quantityDifference: string | null;
  statementCostCents: number | null;
  internalCostCents: number | null;
  costDifferenceCents: number | null;
  previousStatementQuantity: string | null;
  previousStatementCostCents: number | null;
  previousStatementBalanceCents: number | null;
  currentStatementBalanceCents: number | null;
  canApplyBaseline: boolean;
};

type IncomeReconciliationItem = {
  statementIds: string[];
  sourceInstitutions: string[];
  descriptions: string[];
  symbol: string | null;
  currency: string;
  internalAssetId: string | null;
  status: AnnualStatementReconciliationStatus;
  reason: string | null;
  statementAmountCents: number | null;
  internalAmountCents: number | null;
  differenceCents: number | null;
  eventIds: string[];
};

type WithholdingReconciliationItem = {
  statementIds: string[];
  sourceInstitutions: string[];
  descriptions: string[];
  symbol: string | null;
  currency: string;
  internalAssetId: string | null;
  internalAssetType: string | null;
  status: AnnualStatementReconciliationStatus;
  reason: string | null;
  statementAmountCents: number | null;
  internalAmountCents: number | null;
  differenceCents: number | null;
  withholdingIds: string[];
  requiresCompetenceConfirmation: boolean;
};

function arrayOfObjects<T>(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [] as T[];
  return value
    .filter(
      (item) =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => item as unknown as T);
}

function positions(statement: StoredStatement) {
  return arrayOfObjects<ParsedAnnualFinancialStatementPosition>(
    statement.positions,
  );
}

function incomes(statement: StoredStatement) {
  return arrayOfObjects<ParsedAnnualFinancialStatementIncome>(
    statement.incomes,
  );
}

function taxWithholdings(statement: StoredStatement) {
  return arrayOfObjects<ParsedAnnualFinancialStatementTaxWithholding>(
    statement.taxWithholdings,
  );
}

function normalizeSymbol(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? null;
}

function quantityUnits(value: string | null) {
  if (value === null) return null;
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]!);
  const fraction = (match[2] ?? "").padEnd(8, "0");
  return whole * INVESTMENT_QUANTITY_SCALE + BigInt(fraction || "0");
}

function quantityDifference(
  internalQuantity: string | null,
  statementQuantity: string | null,
) {
  const internal = internalQuantity === null ? null : quantityUnits(internalQuantity);
  const external = statementQuantity === null ? null : quantityUnits(statementQuantity);
  if (internal === null || external === null) return null;
  return formatInvestmentQuantity(internal - external);
}

async function readAnnualFinancialStatements(userId: string, year: number) {
  return prisma.annualFinancialTaxStatement.findMany({
    where: { userId, calendarYear: year },
    orderBy: [{ sourceInstitution: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      calendarYear: true,
      sourceInstitution: true,
      sourceInstitutionCnpj: true,
      documentType: true,
      positions: true,
      incomes: true,
      taxWithholdings: true,
      notes: true,
      warnings: true,
      createdAt: true,
    },
  });
}

function summaryOf(
  items: Array<{ status: AnnualStatementReconciliationStatus }>,
) {
  return {
    total: items.length,
    matched: items.filter((item) => item.status === "MATCHED").length,
    mismatch: items.filter((item) => item.status === "MISMATCH").length,
    missingInternal: items.filter((item) => item.status === "MISSING_INTERNAL")
      .length,
    missingStatementData: items.filter(
      (item) => item.status === "MISSING_STATEMENT_DATA",
    ).length,
    reviewRequired: items.filter((item) => item.status === "REVIEW_REQUIRED")
      .length,
  };
}

export async function getAnnualFinancialStatementReconciliationForUser(
  userId: string,
  year: number,
) {
  const [statements, snapshot, incomeReport, assets, internalWithholdings] =
    await Promise.all([
    readAnnualFinancialStatements(userId, year),
    getInvestmentFiscalYearEndSnapshotForUser(userId, year),
    getInvestmentAnnualIncomeReportForUser(userId, year),
    prisma.investmentAsset.findMany({
      where: { userId },
      select: { id: true, symbol: true, currency: true, type: true },
    }),
    prisma.investmentTaxWithholding.findMany({
      where: { userId, year },
      include: {
        asset: { select: { id: true, symbol: true, currency: true, type: true } },
        operation: {
          include: {
            asset: {
              select: { id: true, symbol: true, currency: true, type: true },
            },
          },
        },
      },
      orderBy: [
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  if (statements.length === 0) {
    const empty = {
      total: 0,
      matched: 0,
      mismatch: 0,
      missingInternal: 0,
      missingStatementData: 0,
      reviewRequired: 0,
    };
    return {
      year,
      statementCount: 0,
      status: "MATCHED" as const,
      summary: {
        positions: empty,
        incomes: { ...empty },
        withholdings: { ...empty },
        reviewCount: 0,
      },
      statements: [],
      positions: [] as PositionReconciliationItem[],
      incomes: [] as IncomeReconciliationItem[],
      withholdings: [] as WithholdingReconciliationItem[],
    };
  }

  const assetByKey = new Map(
    assets.map((asset) => [
      normalizeSymbol(asset.symbol) + "|" + asset.currency,
      asset,
    ]),
  );
  const snapshotByAsset = new Map(
    snapshot.current.items.map((item) => [item.assetId, item]),
  );
  const statementPositionKeys = new Set<string>();

  const positionItems: PositionReconciliationItem[] = statements.flatMap((statement) =>
    positions(statement).map((position, positionIndex) => {
      const symbol = normalizeSymbol(position.symbol);
      const key = symbol ? symbol + "|" + position.currency : null;
      if (key) statementPositionKeys.add(key);
      const asset = key ? assetByKey.get(key) ?? null : null;
      const internal = asset ? snapshotByAsset.get(asset.id) ?? null : null;

      let status: AnnualStatementReconciliationStatus;
      let reason: string | null = null;

      if (!symbol) {
        status = "REVIEW_REQUIRED";
        reason =
          "A posição do informe não possui código de ativo suficiente para vínculo automático.";
      } else if (!asset || !internal) {
        status = "MISSING_INTERNAL";
        reason =
          "A posição existe no informe, mas não existe posição fiscal correspondente no sistema.";
      } else if (position.currentYearQuantity === null) {
        status = "MISSING_STATEMENT_DATA";
        reason =
          "O informe não trouxe quantidade de 31/12 para comparar com a posição fiscal.";
      } else {
        const internalUnits = quantityUnits(internal.quantity);
        const statementUnits = quantityUnits(position.currentYearQuantity);
        if (internalUnits === null || statementUnits === null) {
          status = "REVIEW_REQUIRED";
          reason = "Quantidade inválida ou não comparável.";
        } else if (internalUnits !== statementUnits) {
          status = "MISMATCH";
          reason = "A quantidade de 31/12 diverge do snapshot fiscal.";
        } else if (
          position.currentYearCostCents !== null &&
          internal.costBasisCents !== position.currentYearCostCents
        ) {
          status = "MISMATCH";
          reason = "O custo explicitamente informado diverge do custo fiscal calculado.";
        } else {
          status = "MATCHED";
        }
      }

      return {
        statementId: statement.id,
        positionIndex,
        sourceInstitution: statement.sourceInstitution,
        sourceInstitutionCnpj: statement.sourceInstitutionCnpj,
        description: position.description,
        type: position.type,
        symbol,
        currency: position.currency,
        internalAssetId: asset?.id ?? null,
        internalAssetType: asset?.type ?? null,
        status,
        reason,
        statementQuantity: position.currentYearQuantity,
        internalQuantity: internal?.quantity ?? null,
        quantityDifference: quantityDifference(
          internal?.quantity ?? null,
          position.currentYearQuantity,
        ),
        statementCostCents: position.currentYearCostCents,
        internalCostCents: internal?.costBasisCents ?? null,
        costDifferenceCents:
          position.currentYearCostCents !== null && internal
            ? internal.costBasisCents - position.currentYearCostCents
            : null,
        previousStatementQuantity: position.previousYearQuantity,
        previousStatementCostCents: position.previousYearCostCents,
        previousStatementBalanceCents: position.previousYearBalanceCents,
        currentStatementBalanceCents: position.currentYearBalanceCents,
        canApplyBaseline:
          Boolean(asset) &&
          position.currentYearQuantity !== null &&
          quantityUnits(position.currentYearQuantity) !== null &&
          quantityUnits(position.currentYearQuantity) !== BigInt(0) &&
          position.currentYearCostCents !== null,
      };
    }),
  );

  for (const internal of snapshot.current.items) {
    const key = normalizeSymbol(internal.symbol) + "|" + internal.currency;
    if (statementPositionKeys.has(key)) continue;
    positionItems.push({
      statementId: null,
      positionIndex: null,
      sourceInstitution: null,
      sourceInstitutionCnpj: null,
      description: internal.symbol,
      type: "OTHER",
      symbol: internal.symbol,
      currency: internal.currency,
      internalAssetId: internal.assetId,
      internalAssetType: internal.assetType,
      status: "MISSING_STATEMENT_DATA",
      reason:
        "A posição fiscal existe no sistema, mas não foi encontrada em nenhum informe importado.",
      statementQuantity: null,
      internalQuantity: internal.quantity,
      quantityDifference: null,
      statementCostCents: null,
      internalCostCents: internal.costBasisCents,
      costDifferenceCents: null,
      previousStatementQuantity: null,
      previousStatementCostCents: null,
      previousStatementBalanceCents: null,
      currentStatementBalanceCents: null,
      canApplyBaseline: false,
    });
  }

  const statementIncomeGroups = new Map<
    string,
    {
      symbol: string | null;
      currency: string;
      amountCents: number | null;
      statementIds: Set<string>;
      sourceInstitutions: Set<string>;
      descriptions: string[];
    }
  >();

  for (const statement of statements) {
    for (const income of incomes(statement)) {
      const symbol = normalizeSymbol(income.symbol);
      const key = (symbol ?? "~unlinked:" + income.description) + "|" + income.currency;
      const current = statementIncomeGroups.get(key) ?? {
        symbol,
        currency: income.currency,
        amountCents: 0,
        statementIds: new Set<string>(),
        sourceInstitutions: new Set<string>(),
        descriptions: [],
      };
      if (income.amountCents === null) current.amountCents = null;
      else if (current.amountCents !== null) current.amountCents += income.amountCents;
      current.statementIds.add(statement.id);
      current.sourceInstitutions.add(statement.sourceInstitution);
      current.descriptions.push(income.description);
      statementIncomeGroups.set(key, current);
    }
  }

  const internalIncomeByKey = new Map<
    string,
    {
      assetId: string;
      symbol: string;
      currency: string;
      amountCents: number;
      eventIds: string[];
    }
  >();
  for (const item of incomeReport.items) {
    const key = normalizeSymbol(item.symbol) + "|" + item.currency;
    const current = internalIncomeByKey.get(key) ?? {
      assetId: item.assetId,
      symbol: item.symbol,
      currency: item.currency,
      amountCents: 0,
      eventIds: [],
    };
    current.amountCents += item.netAmountCents;
    current.eventIds.push(...item.events.map((event) => event.id));
    internalIncomeByKey.set(key, current);
  }

  const statementIncomeKeys = new Set<string>();
  const incomeItems: IncomeReconciliationItem[] = [...statementIncomeGroups.values()].map((external) => {
    const key = external.symbol
      ? external.symbol + "|" + external.currency
      : null;
    if (key) statementIncomeKeys.add(key);
    const asset = key ? assetByKey.get(key) ?? null : null;
    const internal = key ? internalIncomeByKey.get(key) ?? null : null;

    let status: AnnualStatementReconciliationStatus;
    let reason: string | null = null;
    if (!external.symbol) {
      status = "REVIEW_REQUIRED";
      reason =
        "O rendimento do informe não possui ativo suficiente para vínculo automático.";
    } else if (!asset || !internal) {
      status = "MISSING_INTERNAL";
      reason =
        "O rendimento existe no informe, mas não há pagamentos internos correspondentes.";
    } else if (external.amountCents === null) {
      status = "MISSING_STATEMENT_DATA";
      reason = "O informe não trouxe valor anual comparável para este rendimento.";
    } else if (internal.amountCents !== external.amountCents) {
      status = "MISMATCH";
      reason = "O total anual de rendimentos diverge do informe.";
    } else {
      status = "MATCHED";
    }

    return {
      statementIds: [...external.statementIds],
      sourceInstitutions: [...external.sourceInstitutions],
      descriptions: external.descriptions,
      symbol: external.symbol,
      currency: external.currency,
      internalAssetId: asset?.id ?? null,
      status,
      reason,
      statementAmountCents: external.amountCents,
      internalAmountCents: internal?.amountCents ?? null,
      differenceCents:
        external.amountCents !== null && internal
          ? internal.amountCents - external.amountCents
          : null,
      eventIds: internal?.eventIds ?? [],
    };
  });

  for (const [key, internal] of internalIncomeByKey) {
    if (statementIncomeKeys.has(key)) continue;
    incomeItems.push({
      statementIds: [],
      sourceInstitutions: [],
      descriptions: [],
      symbol: internal.symbol,
      currency: internal.currency,
      internalAssetId: internal.assetId,
      status: "MISSING_STATEMENT_DATA",
      reason:
        "Há rendimentos registrados no sistema, mas nenhum valor correspondente foi encontrado nos informes importados.",
      statementAmountCents: null,
      internalAmountCents: internal.amountCents,
      differenceCents: null,
      eventIds: internal.eventIds,
    });
  }

  const statementWithholdingGroups = new Map<
    string,
    {
      symbol: string | null;
      currency: string;
      amountCents: number | null;
      statementIds: Set<string>;
      sourceInstitutions: Set<string>;
      descriptions: string[];
    }
  >();

  for (const statement of statements) {
    for (const withholding of taxWithholdings(statement)) {
      const symbol = normalizeSymbol(withholding.symbol);
      const key =
        (symbol ?? "~unlinked:" + withholding.description) +
        "|" +
        withholding.currency;
      const current = statementWithholdingGroups.get(key) ?? {
        symbol,
        currency: withholding.currency,
        amountCents: 0,
        statementIds: new Set<string>(),
        sourceInstitutions: new Set<string>(),
        descriptions: [],
      };
      if (withholding.amountCents === null) current.amountCents = null;
      else if (current.amountCents !== null) {
        current.amountCents += withholding.amountCents;
      }
      current.statementIds.add(statement.id);
      current.sourceInstitutions.add(statement.sourceInstitution);
      current.descriptions.push(withholding.description);
      statementWithholdingGroups.set(key, current);
    }
  }

  const internalWithholdingByKey = new Map<
    string,
    {
      assetId: string;
      assetType: string;
      symbol: string;
      currency: string;
      amountCents: number;
      withholdingIds: string[];
    }
  >();
  const unlinkedInternalWithholdings = internalWithholdings.filter(
    (withholding) => !withholding.asset && !withholding.operation?.asset,
  );

  for (const withholding of internalWithholdings) {
    const linkedAsset = withholding.asset ?? withholding.operation?.asset ?? null;
    if (!linkedAsset) continue;
    const symbol = normalizeSymbol(linkedAsset.symbol)!;
    const key = symbol + "|" + withholding.currency;
    const current = internalWithholdingByKey.get(key) ?? {
      assetId: linkedAsset.id,
      assetType: linkedAsset.type,
      symbol,
      currency: withholding.currency,
      amountCents: 0,
      withholdingIds: [],
    };
    current.amountCents += withholding.amountCents;
    current.withholdingIds.push(withholding.id);
    internalWithholdingByKey.set(key, current);
  }

  const statementWithholdingKeys = new Set<string>();
  const withholdingItems: WithholdingReconciliationItem[] = [
    ...statementWithholdingGroups.values(),
  ].map((external) => {
    const key = external.symbol
      ? external.symbol + "|" + external.currency
      : null;
    if (key) statementWithholdingKeys.add(key);
    const asset = key ? assetByKey.get(key) ?? null : null;
    const internal = key ? internalWithholdingByKey.get(key) ?? null : null;

    let status: AnnualStatementReconciliationStatus;
    let reason: string | null = null;
    if (!external.symbol) {
      status = "REVIEW_REQUIRED";
      reason =
        "O IRRF do informe não possui ativo suficiente para vínculo automático.";
    } else if (!asset) {
      status = "MISSING_INTERNAL";
      reason =
        "O IRRF existe no informe, mas o ativo correspondente não existe no sistema.";
    } else if (external.amountCents === null) {
      status = "MISSING_STATEMENT_DATA";
      reason = "O informe não trouxe valor de IRRF comparável.";
    } else if (!internal) {
      status = "MISSING_INTERNAL";
      reason =
        "O informe possui IRRF para este ativo, mas não há registro interno correspondente.";
    } else if (internal.amountCents !== external.amountCents) {
      status = "MISMATCH";
      reason = "O total anual de IRRF diverge do informe.";
    } else {
      status = "MATCHED";
    }

    return {
      statementIds: [...external.statementIds],
      sourceInstitutions: [...external.sourceInstitutions],
      descriptions: external.descriptions,
      symbol: external.symbol,
      currency: external.currency,
      internalAssetId: asset?.id ?? null,
      internalAssetType: asset?.type ?? null,
      status,
      reason,
      statementAmountCents: external.amountCents,
      internalAmountCents: internal?.amountCents ?? null,
      differenceCents:
        external.amountCents !== null && internal
          ? internal.amountCents - external.amountCents
          : null,
      withholdingIds: internal?.withholdingIds ?? [],
      requiresCompetenceConfirmation:
        status !== "MATCHED" && external.amountCents !== null && Boolean(asset),
    };
  });

  for (const [key, internal] of internalWithholdingByKey) {
    if (statementWithholdingKeys.has(key)) continue;
    withholdingItems.push({
      statementIds: [],
      sourceInstitutions: [],
      descriptions: [],
      symbol: internal.symbol,
      currency: internal.currency,
      internalAssetId: internal.assetId,
      internalAssetType: internal.assetType,
      status: "MISSING_STATEMENT_DATA",
      reason:
        "Há IRRF registrado no sistema, mas nenhum valor correspondente foi encontrado nos informes importados.",
      statementAmountCents: null,
      internalAmountCents: internal.amountCents,
      differenceCents: null,
      withholdingIds: internal.withholdingIds,
      requiresCompetenceConfirmation: false,
    });
  }

  if (unlinkedInternalWithholdings.length > 0) {
    withholdingItems.push({
      statementIds: [],
      sourceInstitutions: [],
      descriptions: [
        "Existem registros internos de IRRF sem vínculo seguro com ativo/operação.",
      ],
      symbol: null,
      currency: "BRL",
      internalAssetId: null,
      internalAssetType: null,
      status: "REVIEW_REQUIRED",
      reason:
        "Registros internos sem vínculo de ativo não podem ser reconciliados automaticamente com o informe.",
      statementAmountCents: null,
      internalAmountCents: unlinkedInternalWithholdings.reduce(
        (sum, item) => sum + item.amountCents,
        0,
      ),
      differenceCents: null,
      withholdingIds: unlinkedInternalWithholdings.map((item) => item.id),
      requiresCompetenceConfirmation: false,
    });
  }

  positionItems.sort((left, right) =>
    (left.symbol ?? left.description).localeCompare(
      right.symbol ?? right.description,
    ),
  );
  incomeItems.sort((left, right) =>
    (left.symbol ?? left.descriptions[0] ?? "").localeCompare(
      right.symbol ?? right.descriptions[0] ?? "",
    ),
  );
  withholdingItems.sort((left, right) =>
    (left.symbol ?? left.descriptions[0] ?? "").localeCompare(
      right.symbol ?? right.descriptions[0] ?? "",
    ),
  );

  const positionSummary = summaryOf(positionItems);
  const incomeSummary = summaryOf(incomeItems);
  const withholdingSummary = summaryOf(withholdingItems);
  const reviewCount =
    positionSummary.total -
      positionSummary.matched +
    incomeSummary.total -
      incomeSummary.matched +
    withholdingSummary.total -
      withholdingSummary.matched;

  return {
    year,
    statementCount: statements.length,
    status: reviewCount === 0 ? ("MATCHED" as const) : ("REVIEW_REQUIRED" as const),
    summary: {
      positions: positionSummary,
      incomes: incomeSummary,
      withholdings: withholdingSummary,
      reviewCount,
    },
    statements: statements.map((statement) => ({
      id: statement.id,
      sourceInstitution: statement.sourceInstitution,
      sourceInstitutionCnpj: statement.sourceInstitutionCnpj,
      documentType: statement.documentType,
      positionCount: positions(statement).length,
      incomeCount: incomes(statement).length,
      withholdingCount: taxWithholdings(statement).length,
      createdAt: statement.createdAt,
    })),
    positions: positionItems,
    incomes: incomeItems,
    withholdings: withholdingItems,
  };
}

export async function getAnnualFinancialStatementReconciliation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getAnnualFinancialStatementReconciliationForUser(
        userId,
        input.year,
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Não foi possível reconciliar os informes anuais", 500);
  }
}
