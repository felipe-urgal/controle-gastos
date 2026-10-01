import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  deriveInvestmentPositions,
  formatInvestmentQuantity,
  InvestmentPositionError,
  parseInvestmentQuantity,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";
import {
  createInvestmentAssetSchema,
  createInvestmentOperationSchema,
} from "@/app/lib/investments/investment-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

const operationInclude = {
  asset: {
    select: {
      id: true,
      symbol: true,
      name: true,
      type: true,
      currency: true,
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
} as const;

type OperationRow = Prisma.InvestmentOperationGetPayload<{
  include: typeof operationInclude;
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
    },
    createdAt: operation.createdAt,
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

export async function listInvestmentPortfolioForUser(userId: string) {
  const [accounts, assets, operations] = await Promise.all([
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
      include: { _count: { select: { operations: true } } },
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
  ]);

  const positions = deriveInvestmentPositions(
    operations.map(toPositionOperation),
  );

  return {
    accounts,
    assets: assets.map((asset) => ({
      ...toAsset(asset),
      operationCount: asset._count.operations,
    })),
    positions,
    totalsByCurrency: totalsByCurrency(positions),
    operations: [...operations].reverse().map(toOperation),
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

export async function createInvestmentAsset(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInvestmentAssetSchema.parse(await parseJsonBody(request));

    const created = await prisma.investmentAsset.create({
      data: { userId, ...input },
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
        _count: { select: { operations: true } },
      },
    });
    if (!asset) return failure("Ativo não encontrado", 404);
    if (asset._count.operations > 0) {
      throw new HttpError(
        "Ativo com histórico de operações não pode ser excluído",
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

async function createOperationSerializable(
  userId: string,
  input: ReturnType<typeof createInvestmentOperationSchema.parse>,
) {
  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const [account, asset] = await Promise.all([
            tx.account.findFirst({
              where: { id: input.accountId, userId },
              select: { id: true, name: true, currency: true, type: true },
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

          return tx.investmentOperation.create({
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
            include: operationInclude,
          });
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
          "A posição mudou durante a operação; recarregue e tente novamente",
          409,
          "INVESTMENT_POSITION_CHANGED",
        );
      }
      throw error;
    }
  }

  throw new HttpError(
    "Não foi possível registrar a operação",
    409,
    "INVESTMENT_POSITION_CHANGED",
  );
}

export async function createInvestmentOperation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInvestmentOperationSchema.parse(
      await parseJsonBody(request),
    );
    const created = await createOperationSerializable(userId, input);
    return success(toOperation(created), "Operação criada com sucesso", 201);
  } catch (error) {
    return handleInvestmentError(error, "Erro ao criar operação");
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
