import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { fetchBrapiQuote } from "@/app/lib/investments/brapi-client";
import {
  deriveFiscalCostBasis,
  fiscalQuantityMismatchMessage,
} from "@/app/lib/investments/investment-fiscal-cost-domain";
import {
  deriveInvestmentPositions,
  formatInvestmentQuantity,
  INVESTMENT_QUANTITY_SCALE,
  InvestmentPositionError,
  parseInvestmentQuantity,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";
import {
  createInvestmentAssetSchema,
  createInvestmentFiscalCostAdjustmentSchema,
  createInvestmentOperationSchema,
  updateInvestmentFiscalEventSchema,
} from "@/app/lib/investments/investment-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { runInvestmentIdempotentMutation } from "@/app/lib/investments/investment-idempotency";
import { prisma } from "@/app/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const BRAPI_QUOTE_TTL_MS = 15 * 60 * 1_000;
const BRAPI_QUOTEABLE_TYPES = new Set(["STOCK", "FII", "ETF"]);

const operationInclude = {
  asset: {
    select: {
      id: true,
      symbol: true,
      name: true,
      type: true,
      currency: true,
      taxLocation: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      currency: true,
      type: true,
    },
  },
  fiscalEvent: {
    select: {
      id: true,
      type: true,
      originalType: true,
      classificationSource: true,
      sourceInstitution: true,
      destinationInstitution: true,
      reclassificationNote: true,
      updatedAt: true,
    },
  },
} as const;

type OperationRow = Prisma.InvestmentOperationGetPayload<{
  include: typeof operationInclude;
}>;

const incomeInclude = {
  asset: {
    select: {
      id: true,
      symbol: true,
      name: true,
      type: true,
      currency: true,
      taxLocation: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      currency: true,
    },
  },
} as const;

type IncomeRow = Prisma.InvestmentIncomeGetPayload<{
  include: typeof incomeInclude;
}>;

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function dateFromParts(value: { year: number; month: number; day: number }) {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function toAsset(asset: {
  id: string;
  symbol: string;
  name: string | null;
  type: string;
  currency: string;
  market: string | null;
  taxLocation: "BRAZIL" | "ABROAD";
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    type: asset.type,
    currency: asset.currency,
    market: asset.market,
    taxLocation: asset.taxLocation,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

function toOperation(operation: OperationRow) {
  return {
    id: operation.id,
    type: operation.type,
    quantity: formatInvestmentQuantity(operation.quantityUnits),
    unitPriceCents: operation.unitPriceCents,
    feesCents: operation.feesCents,
    date: dateFromParts(operation),
    note: operation.note,
    fiscalEvent: operation.fiscalEvent
      ? {
          id: operation.fiscalEvent.id,
          type: operation.fiscalEvent.type,
          originalType: operation.fiscalEvent.originalType,
          classificationSource: operation.fiscalEvent.classificationSource,
          sourceInstitution: operation.fiscalEvent.sourceInstitution,
          destinationInstitution: operation.fiscalEvent.destinationInstitution,
          reclassificationNote: operation.fiscalEvent.reclassificationNote,
          updatedAt: operation.fiscalEvent.updatedAt,
        }
      : null,
    account: {
      id: operation.account.id,
      name: operation.account.name,
      currency: operation.account.currency,
    },
    asset: {
      id: operation.asset.id,
      symbol: operation.asset.symbol,
      name: operation.asset.name,
      type: operation.asset.type,
      currency: operation.asset.currency,
      taxLocation: operation.asset.taxLocation,
    },
    createdAt: operation.createdAt,
  };
}

function toIncome(income: IncomeRow) {
  return {
    id: income.id,
    type: income.type,
    quantity: formatInvestmentQuantity(income.quantityUnits),
    unitValueCents: income.unitValueCents,
    netAmountCents: income.netAmountCents,
    date: dateFromParts(income),
    note: income.note,
    account: {
      id: income.account.id,
      name: income.account.name,
      currency: income.account.currency,
    },
    asset: {
      id: income.asset.id,
      symbol: income.asset.symbol,
      name: income.asset.name,
      type: income.asset.type,
      currency: income.asset.currency,
      taxLocation: income.asset.taxLocation,
    },
    createdAt: income.createdAt,
  };
}

function toPositionOperation(
  operation: OperationRow,
): InvestmentOperationForPosition {
  return {
    id: operation.id,
    type: operation.type,
    quantityUnits: operation.quantityUnits,
    unitPriceCents: operation.unitPriceCents,
    feesCents: operation.feesCents,
    year: operation.year,
    month: operation.month,
    day: operation.day,
    sequence: operation.sequence,
    createdAt: operation.createdAt,
    accountId: operation.account.id,
    accountName: operation.account.name,
    assetId: operation.asset.id,
    assetSymbol: operation.asset.symbol,
    assetName: operation.asset.name,
    assetType: operation.asset.type,
    currency: operation.asset.currency,
  };
}

function positionError(error: InvestmentPositionError) {
  if (error.code === "AMOUNT_TOO_LARGE") {
    return new HttpError(error.message, 400, error.code);
  }
  return new HttpError(error.message, 409, error.code);
}

function totalsByCurrency(
  positions: ReturnType<typeof deriveInvestmentPositions>,
) {
  return positions.reduce<Record<string, number>>((totals, position) => {
    totals[position.currency] =
      (totals[position.currency] ?? 0) + position.investedCents;
    return totals;
  }, {});
}

function quoteIsStale(fetchedAt: Date, now = new Date()) {
  return now.getTime() - fetchedAt.getTime() >= BRAPI_QUOTE_TTL_MS;
}

function marketValueCents(quantity: string, priceCents: number) {
  const quantityUnits = parseInvestmentQuantity(quantity);
  if (quantityUnits === null) return null;

  const rounded =
    (quantityUnits * BigInt(priceCents) + INVESTMENT_QUANTITY_SCALE / BigInt(2)) /
    INVESTMENT_QUANTITY_SCALE;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(rounded);
}

function serializeQuote(
  quote: {
    priceCents: number;
    currency: string;
    referenceAt: Date;
    fetchedAt: Date;
  } | null,
  now = new Date(),
) {
  if (!quote) return null;
  return {
    priceCents: quote.priceCents,
    currency: quote.currency,
    referenceAt: quote.referenceAt,
    fetchedAt: quote.fetchedAt,
    source: "BRAPI" as const,
    isStale: quoteIsStale(quote.fetchedAt, now),
  };
}

export async function listInvestmentPortfolioForUser(userId: string) {
  const [accounts, assets, operations, incomes, fiscalEvents, fiscalCostAdjustments] =
    await Promise.all([
    prisma.account.findMany({
      where: { userId, type: "INVESTMENT" },
      select: {
        id: true,
        name: true,
        currency: true,
        isActive: true,
        color: true,
        icon: true,
      },
      orderBy: [{ isActive: "desc" }, { currency: "asc" }, { name: "asc" }],
    }),
    prisma.investmentAsset.findMany({
      where: { userId },
      include: {
        quote: true,
        _count: { select: { operations: true, incomes: true } },
      },
      orderBy: [{ currency: "asc" }, { symbol: "asc" }],
    }),
    prisma.investmentOperation.findMany({
      where: { userId },
      include: operationInclude,
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentIncome.findMany({
      where: { userId },
      include: incomeInclude,
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentFiscalEvent.findMany({
      where: { userId },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            type: true,
            currency: true,
          },
        },
        operation: {
          select: {
            unitPriceCents: true,
            feesCents: true,
          },
        },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentFiscalCostAdjustment.findMany({
      where: { userId },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            type: true,
            currency: true,
          },
        },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  const positions = deriveInvestmentPositions(
    operations.map(toPositionOperation),
  );
  const quotesByAsset = new Map(
    assets.map((asset) => [asset.id, asset.quote] as const),
  );
  const positionsWithQuotes = positions.map((position) => {
    const quote = serializeQuote(quotesByAsset.get(position.assetId) ?? null);
    return {
      ...position,
      marketValueCents: quote
        ? marketValueCents(position.quantity, quote.priceCents)
        : null,
      quote,
    };
  });

  const economicQuantityByAsset = new Map<string, bigint>();
  const economicCostByAsset = new Map<string, number>();
  const marketValueByAsset = new Map<string, number | null>();
  for (const position of positionsWithQuotes) {
    const quantityUnits = parseInvestmentQuantity(position.quantity);
    if (quantityUnits !== null) {
      economicQuantityByAsset.set(
        position.assetId,
        (economicQuantityByAsset.get(position.assetId) ?? BigInt(0)) +
          quantityUnits,
      );
    }
    economicCostByAsset.set(
      position.assetId,
      (economicCostByAsset.get(position.assetId) ?? 0) + position.investedCents,
    );
    const currentMarket = marketValueByAsset.get(position.assetId);
    if (position.marketValueCents === null) {
      marketValueByAsset.set(position.assetId, null);
    } else if (currentMarket !== null) {
      marketValueByAsset.set(
        position.assetId,
        (currentMarket ?? 0) + position.marketValueCents,
      );
    }
  }

  const fiscalEventsByAsset = new Map<string, typeof fiscalEvents>();
  for (const event of fiscalEvents) {
    const list = fiscalEventsByAsset.get(event.assetId) ?? [];
    list.push(event);
    fiscalEventsByAsset.set(event.assetId, list);
  }

  const fiscalAdjustmentsByAsset = new Map<
    string,
    typeof fiscalCostAdjustments
  >();
  for (const adjustment of fiscalCostAdjustments) {
    const list = fiscalAdjustmentsByAsset.get(adjustment.assetId) ?? [];
    list.push(adjustment);
    fiscalAdjustmentsByAsset.set(adjustment.assetId, list);
  }

  const fiscalPositions = assets
    .map((asset) => {
      const assetEvents = fiscalEventsByAsset.get(asset.id) ?? [];
      const assetAdjustments = fiscalAdjustmentsByAsset.get(asset.id) ?? [];
      const economicQuantityUnits =
        economicQuantityByAsset.get(asset.id) ?? BigInt(0);

      if (
        assetEvents.length === 0 &&
        assetAdjustments.length === 0 &&
        economicQuantityUnits === BigInt(0)
      ) {
        return null;
      }

      const derived = deriveFiscalCostBasis({
        events: assetEvents.map((event) => ({
          id: event.id,
          type: event.type,
          quantityUnits: event.quantityUnits,
          year: event.year,
          month: event.month,
          day: event.day,
          sequence: event.sequence,
          createdAt: event.createdAt,
          operation: event.operation,
        })),
        adjustments: assetAdjustments.map((adjustment) => ({
          id: adjustment.id,
          quantityUnits: adjustment.quantityUnits,
          costBasisCents: adjustment.costBasisCents,
          year: adjustment.year,
          month: adjustment.month,
          day: adjustment.day,
          createdAt: adjustment.createdAt,
        })),
      });

      const mismatch = fiscalQuantityMismatchMessage({
        fiscalQuantityUnits: derived.quantityUnits,
        economicQuantityUnits,
      });
      const pending = [
        ...derived.pending,
        ...(mismatch
          ? [
              {
                code: "FISCAL_QUANTITY_MISMATCH" as const,
                eventId: null,
                message: mismatch,
              },
            ]
          : []),
      ];

      return {
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.type,
        currency: asset.currency,
        quantity: formatInvestmentQuantity(derived.quantityUnits),
        economicQuantity: formatInvestmentQuantity(economicQuantityUnits),
        costBasisCents: derived.costBasisCents,
        averageUnitCostCents: derived.averageUnitCostCents,
        economicCostCents: economicCostByAsset.get(asset.id) ?? 0,
        marketValueCents: marketValueByAsset.get(asset.id) ?? null,
        status: pending.length === 0 ? ("OK" as const) : ("PENDING" as const),
        pending,
        lastAdjustmentId: derived.lastAdjustmentId,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    accounts,
    assets: assets.map((asset) => ({
      ...toAsset(asset),
      operationCount: asset._count.operations,
      incomeCount: asset._count.incomes,
    })),
    positions: positionsWithQuotes,
    totalsByCurrency: totalsByCurrency(positions),
    incomeTotalsByCurrency: incomes.reduce<Record<string, number>>((totals, income) => {
      totals[income.asset.currency] =
        (totals[income.asset.currency] ?? 0) + income.netAmountCents;
      return totals;
    }, {}),
    operations: [...operations].reverse().map(toOperation),
    incomes: [...incomes].reverse().map(toIncome),
    fiscalPositions,
    fiscalCostAdjustments: [...fiscalCostAdjustments].reverse().map(
      (adjustment) => ({
        id: adjustment.id,
        assetId: adjustment.assetId,
        symbol: adjustment.asset.symbol,
        quantity: formatInvestmentQuantity(adjustment.quantityUnits),
        costBasisCents: adjustment.costBasisCents,
        date: dateFromParts(adjustment),
        reason: adjustment.reason,
        sourceInstitution: adjustment.sourceInstitution,
        createdAt: adjustment.createdAt,
      }),
    ),
  };
}

export async function getInvestmentPortfolio() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await listInvestmentPortfolioForUser(userId));
  } catch (error) {
    return handleInvestmentError(error, "Erro ao carregar investimentos");
  }
}

export async function createInvestmentFiscalCostAdjustment(
  request: Request,
) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInvestmentFiscalCostAdjustmentSchema.parse(
      await parseJsonBody(request),
    );

    const result = await runInvestmentIdempotentMutation({
      request,
      userId,
      scope: "INVESTMENT_FISCAL_COST_ADJUSTMENT_CREATE",
      payload: input,
      execute: async (tx) => {
        const asset = await tx.investmentAsset.findFirst({
          where: { id: input.assetId, userId },
          select: { id: true, symbol: true },
        });
        if (!asset) throw new HttpError("Ativo não encontrado", 404);

        const quantityUnits = parseInvestmentQuantity(input.quantity);
        if (quantityUnits === null) {
          throw new HttpError("Quantidade fiscal inválida", 400);
        }

        const created = await tx.investmentFiscalCostAdjustment.create({
          data: {
            userId,
            assetId: asset.id,
            quantityUnits,
            costBasisCents: input.costBasisCents,
            ...dateParts(input.date),
            reason: input.reason,
            sourceInstitution: input.sourceInstitution,
          },
          include: { asset: { select: { symbol: true } } },
        });
        return { resourceId: created.id, value: created };
      },
      replay: (tx, resourceId) =>
        tx.investmentFiscalCostAdjustment.findFirst({
          where: { id: resourceId, userId },
          include: { asset: { select: { symbol: true } } },
        }),
    });

    const created = result.value;
    return success(
      {
        id: created.id,
        assetId: created.assetId,
        symbol: created.asset.symbol,
        quantity: formatInvestmentQuantity(created.quantityUnits),
        costBasisCents: created.costBasisCents,
        date: dateFromParts(created),
        reason: created.reason,
        sourceInstitution: created.sourceInstitution,
        createdAt: created.createdAt,
      },
      result.replayed
        ? "Ajuste de custo fiscal já registrado"
        : "Ajuste de custo fiscal registrado com sucesso",
      201,
    );
  } catch (error) {
    return handleInvestmentError(error, "Erro ao registrar ajuste de custo fiscal");
  }
}

export async function refreshInvestmentQuotesForUser(
  userId: string,
  now = new Date(),
) {
  const portfolio = await listInvestmentPortfolioForUser(userId);
  const openAssetIds = [...new Set(portfolio.positions.map((position) => position.assetId))];

  if (openAssetIds.length === 0) {
    return { refreshed: 0, cached: 0, failed: [] };
  }

  const assets = await prisma.investmentAsset.findMany({
    where: { userId, id: { in: openAssetIds } },
    include: { quote: true },
    orderBy: { symbol: "asc" },
  });

  const result: {
    refreshed: number;
    cached: number;
    failed: Array<{ assetId: string; symbol: string; message: string }>;
  } = {
    refreshed: 0,
    cached: 0,
    failed: [],
  };

  for (const asset of assets) {
    const isBrapiAsset =
      asset.currency === "BRL" &&
      BRAPI_QUOTEABLE_TYPES.has(asset.type) &&
      (!asset.market || asset.market === "B3");
    if (!isBrapiAsset) continue;

    if (asset.quote && !quoteIsStale(asset.quote.fetchedAt, now)) {
      result.cached += 1;
      continue;
    }

    let quote: Awaited<ReturnType<typeof fetchBrapiQuote>>;
    try {
      quote = await fetchBrapiQuote(asset.symbol);
    } catch (error) {
      result.failed.push({
        assetId: asset.id,
        symbol: asset.symbol,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível consultar a brapi",
      });
      continue;
    }

    if (quote.currency !== asset.currency) {
      result.failed.push({
        assetId: asset.id,
        symbol: asset.symbol,
        message: "Moeda da cotação não corresponde à moeda do ativo",
      });
      continue;
    }

    await prisma.assetQuote.upsert({
      where: { assetId: asset.id },
      create: {
        assetId: asset.id,
        priceCents: quote.priceCents,
        currency: quote.currency,
        referenceAt: quote.referenceAt,
        source: "BRAPI",
        fetchedAt: now,
      },
      update: {
        priceCents: quote.priceCents,
        currency: quote.currency,
        referenceAt: quote.referenceAt,
        source: "BRAPI",
        fetchedAt: now,
      },
    });
    result.refreshed += 1;
  }

  return result;
}

export async function refreshInvestmentQuotes() {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await refreshInvestmentQuotesForUser(userId);
    return success(
      result,
      result.failed.length > 0
        ? "Cotações atualizadas parcialmente"
        : "Cotações atualizadas",
    );
  } catch (error) {
    return handleInvestmentError(error, "Erro ao atualizar cotações");
  }
}

export async function createInvestmentAsset(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInvestmentAssetSchema.parse(await parseJsonBody(request));

    const taxLocation =
      input.taxLocation ?? (input.currency === "BRL" ? "BRAZIL" : "ABROAD");
    const created = await prisma.investmentAsset.create({
      data: { userId, ...input, taxLocation },
    });

    return success(toAsset(created), "Ativo criado com sucesso", 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure(
        "Já existe um ativo com este código e moeda",
        409,
        "INVESTMENT_ASSET_DUPLICATE",
      );
    }
    return handleInvestmentError(error, "Erro ao criar ativo");
  }
}

export async function removeInvestmentAsset(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Ativo não encontrado", 404);
    const { id } = await context.params;

    const asset = await prisma.investmentAsset.findFirst({
      where: { id, userId },
      select: {
        id: true,
        _count: { select: { operations: true, incomes: true } },
      },
    });
    if (!asset) return failure("Ativo não encontrado", 404);
    if (asset._count.operations > 0 || asset._count.incomes > 0) {
      throw new HttpError(
        "Ativo com histórico de operações ou proventos não pode ser excluído",
        409,
        "INVESTMENT_ASSET_HAS_OPERATIONS",
      );
    }

    await prisma.investmentAsset.delete({ where: { id: asset.id } });
    return success(null, "Ativo excluído com sucesso");
  } catch (error) {
    return handleInvestmentError(error, "Erro ao excluir ativo");
  }
}

async function createOperationInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  input: ReturnType<typeof createInvestmentOperationSchema.parse>,
) {
  const [account, asset] = await Promise.all([
    tx.account.findFirst({
      where: { id: input.accountId, userId },
      select: {
        id: true,
        name: true,
        currency: true,
        type: true,
        isActive: true,
      },
    }),
    tx.investmentAsset.findFirst({
      where: { id: input.assetId, userId },
      select: {
        id: true,
        symbol: true,
        name: true,
        type: true,
        currency: true,
      },
    }),
  ]);

  if (!account) {
    throw new HttpError("Conta de investimento não encontrada", 404);
  }
  if (account.type !== "INVESTMENT") {
    throw new HttpError(
      "Operações só podem usar contas do tipo investimento",
      409,
      "INVESTMENT_ACCOUNT_REQUIRED",
    );
  }
  if (!account.isActive) {
    throw new HttpError(
      "Não é possível registrar nova operação em conta de investimento inativa",
      409,
      "INVESTMENT_ACCOUNT_INACTIVE",
    );
  }
  if (!asset) throw new HttpError("Ativo não encontrado", 404);
  if (account.currency !== asset.currency) {
    throw new HttpError(
      "A moeda do ativo deve ser igual à moeda da conta de investimento",
      409,
      "INVESTMENT_CURRENCY_MISMATCH",
    );
  }

  const quantityUnits = parseInvestmentQuantity(input.quantity);
  if (quantityUnits === null) {
    throw new HttpError("Quantidade inválida", 400);
  }

  const existing = await tx.investmentOperation.findMany({
    where: {
      userId,
      accountId: account.id,
      assetId: asset.id,
    },
    include: operationInclude,
    orderBy: [
      { year: "asc" },
      { month: "asc" },
      { day: "asc" },
      { sequence: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  const candidate: InvestmentOperationForPosition = {
    id: "~candidate",
    type: input.type,
    quantityUnits,
    unitPriceCents: input.unitPriceCents,
    feesCents: input.feesCents,
    ...dateParts(input.date),
    sequence: null,
    createdAt: new Date(),
    accountId: account.id,
    accountName: account.name,
    assetId: asset.id,
    assetSymbol: asset.symbol,
    assetName: asset.name,
    assetType: asset.type,
    currency: asset.currency,
  };

  try {
    deriveInvestmentPositions([
      ...existing.map(toPositionOperation),
      candidate,
    ]);
  } catch (error) {
    if (error instanceof InvestmentPositionError) {
      throw positionError(error);
    }
    throw error;
  }

  const created = await tx.investmentOperation.create({
    data: {
      userId,
      accountId: account.id,
      assetId: asset.id,
      type: input.type,
      quantityUnits,
      unitPriceCents: input.unitPriceCents,
      feesCents: input.feesCents,
      ...dateParts(input.date),
      note: input.note,
    },
  });

  await tx.investmentFiscalEvent.create({
    data: {
      userId,
      accountId: account.id,
      assetId: asset.id,
      operationId: created.id,
      type: input.type,
      originalType: input.type,
      classificationSource: "SYSTEM",
      quantityUnits,
      ...dateParts(input.date),
    },
  });

  return tx.investmentOperation.findUniqueOrThrow({
    where: { id: created.id },
    include: operationInclude,
  });
}

export async function createInvestmentOperation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInvestmentOperationSchema.parse(
      await parseJsonBody(request),
    );
    const result = await runInvestmentIdempotentMutation({
      request,
      userId,
      scope: "INVESTMENT_OPERATION_CREATE",
      payload: input,
      execute: async (tx) => {
        const created = await createOperationInTransaction(tx, userId, input);
        return { resourceId: created.id, value: created };
      },
      replay: (tx, resourceId) =>
        tx.investmentOperation.findFirst({
          where: { id: resourceId, userId },
          include: operationInclude,
        }),
    });
    return success(
      toOperation(result.value),
      result.replayed ? "Operação já registrada" : "Operação criada com sucesso",
      201,
    );
  } catch (error) {
    return handleInvestmentError(error, "Erro ao criar operação");
  }
}

export async function updateInvestmentOperationFiscalEvent(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Operação não encontrada", 404);
    const { id } = await context.params;
    const input = updateInvestmentFiscalEventSchema.parse(
      await parseJsonBody(request),
    );

    const updated = await prisma.$transaction(async (tx) => {
      const operation = await tx.investmentOperation.findFirst({
        where: { id, userId },
        include: operationInclude,
      });
      if (!operation) throw new HttpError("Operação não encontrada", 404);

      const originalType = operation.fiscalEvent?.originalType ?? operation.type;
      await tx.investmentFiscalEvent.upsert({
        where: { operationId: operation.id },
        create: {
          userId,
          accountId: operation.accountId,
          assetId: operation.assetId,
          operationId: operation.id,
          type: input.type,
          originalType,
          classificationSource: "USER",
          quantityUnits: operation.quantityUnits,
          year: operation.year,
          month: operation.month,
          day: operation.day,
          sourceInstitution: input.sourceInstitution,
          destinationInstitution: input.destinationInstitution,
          reclassificationNote: input.reclassificationNote,
        },
        update: {
          type: input.type,
          classificationSource: "USER",
          sourceInstitution: input.sourceInstitution,
          destinationInstitution: input.destinationInstitution,
          reclassificationNote: input.reclassificationNote,
        },
      });

      return tx.investmentOperation.findUniqueOrThrow({
        where: { id: operation.id },
        include: operationInclude,
      });
    });

    return success(
      toOperation(updated),
      "Classificação fiscal atualizada com sucesso",
    );
  } catch (error) {
    return handleInvestmentError(error, "Erro ao atualizar classificação fiscal");
  }
}

async function removeOperationSerializable(userId: string, id: string) {
  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const operation = await tx.investmentOperation.findFirst({
            where: { id, userId },
            include: operationInclude,
          });
          if (!operation) throw new HttpError("Operação não encontrada", 404);

          const remaining = await tx.investmentOperation.findMany({
            where: {
              userId,
              accountId: operation.accountId,
              assetId: operation.assetId,
              id: { not: operation.id },
            },
            include: operationInclude,
            orderBy: [
              { year: "asc" },
              { month: "asc" },
              { day: "asc" },
              { createdAt: "asc" },
              { id: "asc" },
            ],
          });

          try {
            deriveInvestmentPositions(remaining.map(toPositionOperation));
          } catch (error) {
            if (error instanceof InvestmentPositionError) {
              throw new HttpError(
                "Esta operação não pode ser excluída porque deixaria vendas sem posição suficiente",
                409,
                "INVESTMENT_DELETE_BREAKS_POSITION",
              );
            }
            throw error;
          }

          if (operation.fiscalEvent?.id) {
            const linkedForeignTax = await tx.investmentForeignTaxPaid.count({
              where: {
                userId,
                fiscalEventId: operation.fiscalEvent.id,
              },
            });
            if (linkedForeignTax > 0) {
              throw new HttpError(
                "Remova primeiro o imposto pago no exterior vinculado a esta venda",
                409,
                "INVESTMENT_DELETE_HAS_FOREIGN_TAX_CREDIT",
              );
            }
          }

          await tx.investmentOperation.delete({ where: { id: operation.id } });
          return operation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (retryable && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) continue;
      if (retryable) {
        throw new HttpError(
          "A posição mudou durante a exclusão; recarregue e tente novamente",
          409,
          "INVESTMENT_POSITION_CHANGED",
        );
      }
      throw error;
    }
  }

  throw new HttpError(
    "Não foi possível excluir a operação",
    409,
    "INVESTMENT_POSITION_CHANGED",
  );
}

export async function removeInvestmentOperation(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Operação não encontrada", 404);
    const { id } = await context.params;
    await removeOperationSerializable(userId, id);
    return success(null, "Operação excluída com sucesso");
  } catch (error) {
    return handleInvestmentError(error, "Erro ao excluir operação");
  }
}

function handleInvestmentError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }
  if (isHttpError(error)) {
    return failure(error.message, error.status, error.code);
  }
  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }
  return failure(fallback, 500);
}
