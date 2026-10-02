import { z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";
import { getInvestmentRealizedSalesForUser } from "@/app/lib/investments/investment-realized-result-report";
import { deriveTaxLossCarryforward } from "@/app/lib/investments/investment-tax-loss-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const adjustmentSchema = z.object({
  assetType: z.enum([
    "STOCK",
    "FII",
    "ETF",
    "FIXED_INCOME",
    "CRYPTO",
    "FUND",
    "OTHER",
  ]),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  amountCents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  reason: z.string().trim().min(3).max(500),
});

function handleError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }
  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }
  if (isHttpError(error)) {
    return failure(error.message, error.status, error.code);
  }
  return failure(fallback, 500);
}

export async function getInvestmentTaxLossReportForUser(
  userId: string,
  year: number,
) {
  const [sales, adjustments] = await Promise.all([
    getInvestmentRealizedSalesForUser(userId, year),
    prisma.investmentTaxLossAdjustment.findMany({
      where: { userId, year: { lte: year } },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  const monthlyResultMap = new Map<
    string,
    {
      year: number;
      month: number;
      assetType: string;
      currency: string;
      realizedResultCents: number;
      status: "OK" | "PENDING";
    }
  >();

  for (const sale of sales) {
    const key = [
      sale.year,
      sale.month,
      sale.assetType,
      sale.currency,
    ].join("|");
    const current = monthlyResultMap.get(key) ?? {
      year: sale.year,
      month: sale.month,
      assetType: sale.assetType,
      currency: sale.currency,
      realizedResultCents: 0,
      status: "OK" as const,
    };

    if (sale.status === "PENDING") {
      current.status = "PENDING";
    } else {
      current.realizedResultCents += sale.realizedResultCents;
    }
    monthlyResultMap.set(key, current);
  }

  const ledger = deriveTaxLossCarryforward({
    results: [...monthlyResultMap.values()],
    adjustments: adjustments.map((adjustment) => ({
      id: adjustment.id,
      year: adjustment.year,
      month: adjustment.month,
      assetType: adjustment.assetType,
      currency: adjustment.currency,
      amountCents: adjustment.amountCents,
      reason: adjustment.reason,
      createdAt: adjustment.createdAt,
    })),
  });

  const rows = ledger.filter((row) => row.year === year);
  const pending = rows
    .filter((row) => row.status === "PENDING")
    .map((row) => ({
      year: row.year,
      month: row.month,
      assetType: row.assetType,
      currency: row.currency,
      message:
        "Há venda pendente na apuração mensal. O saldo de prejuízo foi carregado sem aplicar o resultado deste mês.",
    }));

  const closingByClass = new Map<
    string,
    {
      assetType: string;
      currency: string;
      closingLossCents: number;
    }
  >();
  for (const row of rows) {
    closingByClass.set(`${row.assetType}|${row.currency}`, {
      assetType: row.assetType,
      currency: row.currency,
      closingLossCents: row.closingLossCents,
    });
  }

  return {
    year,
    strategy: "EXACT_ASSET_TYPE_V1" as const,
    status: pending.length === 0 ? ("OK" as const) : ("PENDING" as const),
    pending,
    rows,
    closingBalances: [...closingByClass.values()].sort((left, right) => {
      const type = left.assetType.localeCompare(right.assetType);
      if (type !== 0) return type;
      return left.currency.localeCompare(right.currency);
    }),
    adjustments: adjustments
      .filter((item) => item.year === year)
      .map((item) => ({
        id: item.id,
        assetType: item.assetType,
        currency: item.currency,
        amountCents: item.amountCents,
        year: item.year,
        month: item.month,
        reason: item.reason,
        createdAt: item.createdAt,
      })),
  };
}

export async function getInvestmentTaxLossReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(await getInvestmentTaxLossReportForUser(userId, input.year));
  } catch (error) {
    return handleError(error, "Erro ao calcular prejuízos fiscais");
  }
}

export async function createInvestmentTaxLossAdjustment(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = adjustmentSchema.parse(await parseJsonBody(request));

    const created = await prisma.investmentTaxLossAdjustment.create({
      data: {
        userId,
        assetType: input.assetType,
        currency: input.currency,
        amountCents: input.amountCents,
        year: input.year,
        month: input.month,
        reason: input.reason,
      },
    });

    return success(
      {
        id: created.id,
        assetType: created.assetType,
        currency: created.currency,
        amountCents: created.amountCents,
        year: created.year,
        month: created.month,
        reason: created.reason,
        createdAt: created.createdAt,
      },
      "Ajuste de prejuízo fiscal registrado com sucesso",
      201,
    );
  } catch (error) {
    return handleError(error, "Erro ao registrar ajuste de prejuízo fiscal");
  }
}
