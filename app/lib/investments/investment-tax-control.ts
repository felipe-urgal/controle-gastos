import { z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getInvestmentRealizedResultReportForUser } from "@/app/lib/investments/investment-realized-result-report";
import { deriveVersionedInvestmentTax } from "@/app/lib/investments/investment-tax-apuration-domain";
import { prisma } from "@/app/lib/prisma";

const assetTypeSchema = z.enum([
  "STOCK",
  "FII",
  "ETF",
  "FIXED_INCOME",
  "CRYPTO",
  "FUND",
  "OTHER",
]);

const currencySchema = z.enum(["BRL", "USD", "EUR"]);

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const withholdingSchema = z.object({
  assetType: assetTypeSchema,
  currency: currencySchema,
  amountCents: z.number().int().positive().max(2_147_483_647),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  assetId: z.string().uuid().nullable().optional(),
  operationId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

const paymentSchema = z.object({
  assetType: assetTypeSchema,
  currency: currencySchema,
  amountCents: z.number().int().positive().max(2_147_483_647),
  competenceYear: z.number().int().min(2000).max(2100),
  competenceMonth: z.number().int().min(1).max(12),
  code: z.string().trim().min(1).max(10),
  paidYear: z.number().int().min(2000).max(2100),
  paidMonth: z.number().int().min(1).max(12),
  paidDay: z.number().int().min(1).max(31),
  note: z.string().trim().max(500).nullable().optional(),
  receiptReference: z.string().trim().max(120).nullable().optional(),
});

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }
  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }
  return failure(fallback, 500);
}

export async function getInvestmentTaxControlReportForUser(
  userId: string,
  year: number,
) {
  const [realized, lossAdjustments, withholdings, payments] = await Promise.all([
    getInvestmentRealizedResultReportForUser(userId, year),
    prisma.investmentTaxLossAdjustment.findMany({
      where: { userId, year: { lte: year } },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentTaxWithholding.findMany({
      where: { userId, year },
      include: {
        asset: { select: { id: true, symbol: true } },
        operation: {
          select: {
            id: true,
            asset: { select: { symbol: true } },
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
    prisma.investmentTaxPayment.findMany({
      where: { userId, competenceYear: year },
      orderBy: [
        { competenceMonth: "asc" },
        { paidYear: "asc" },
        { paidMonth: "asc" },
        { paidDay: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  const apuration = deriveVersionedInvestmentTax({
    calendarYear: year,
    monthlyResults: realized.monthlyGroups.map((item) => ({
      year: item.year,
      month: item.month,
      assetType: item.assetType,
      currency: item.currency,
      grossProceedsCents: item.grossProceedsCents,
      realizedResultCents: item.realizedResultCents,
      status: item.status,
    })),
    lossAdjustments,
    withholdings,
    payments,
  });

  const totalsByCurrency = apuration.rows.reduce<
    Record<
      string,
      {
        withholdingCents: number;
        paidDarfCents: number;
        taxDueCents: number;
        openTaxBalanceCents: number;
      }
    >
  >((totals, row) => {
    totals[row.currency] ??= {
      withholdingCents: 0,
      paidDarfCents: 0,
      taxDueCents: 0,
      openTaxBalanceCents: 0,
    };
    totals[row.currency].withholdingCents += row.withholdingCents;
    totals[row.currency].paidDarfCents += row.paidDarfCents;
    totals[row.currency].taxDueCents += row.taxDueCents ?? 0;
    totals[row.currency].openTaxBalanceCents = Math.max(
      totals[row.currency].openTaxBalanceCents,
      row.openTaxBalanceCents ?? 0,
    );
    return totals;
  }, {});

  return {
    year,
    taxExercise: apuration.taxExercise,
    ruleSupported: apuration.supported,
    status: !apuration.supported
      ? ("WAITING_RULES" as const)
      : apuration.rows.some((row) => row.status === "PENDING_APURACAO")
        ? ("PENDING" as const)
        : apuration.unsupportedClasses.length > 0 ||
            apuration.unsupportedCurrencies.length > 0
          ? ("PENDING" as const)
          : ("OK" as const),
    ruleDependency: apuration.supported ? null : ("TAX_RULE_CATALOG" as const),
    darfCode: apuration.supported ? apuration.darfCode : null,
    minimumDarfCents: apuration.supported
      ? apuration.minimumDarfCents
      : null,
    ruleSources: apuration.sources,
    unsupportedClasses: apuration.unsupportedClasses,
    unsupportedCurrencies: apuration.unsupportedCurrencies,
    rows: apuration.rows,
    totalsByCurrency,
  };
}

export async function getInvestmentTaxControlReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getInvestmentTaxControlReportForUser(userId, input.year),
    );
  } catch (error) {
    return handleError(error, "Erro ao carregar controle de IRRF e DARF");
  }
}

export async function createInvestmentTaxWithholding(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = withholdingSchema.parse(await parseJsonBody(request));

    if (input.currency !== "BRL") {
      return failure(
        "IRRF deste controle fiscal aceita somente BRL. Investimentos no exterior exigem tratamento fiscal próprio.",
        400,
      );
    }

    if (!validDate(input.year, input.month, input.day)) {
      return failure("Data do IRRF inválida", 400);
    }

    if (input.assetId) {
      const asset = await prisma.investmentAsset.findFirst({
        where: { id: input.assetId, userId },
        select: { type: true, currency: true },
      });
      if (!asset) return failure("Ativo não encontrado", 404);
      if (asset.type !== input.assetType || asset.currency !== input.currency) {
        return failure("Classe/moeda não correspondem ao ativo", 400);
      }
    }

    if (input.operationId) {
      const operation = await prisma.investmentOperation.findFirst({
        where: { id: input.operationId, userId },
        include: {
          asset: { select: { type: true, currency: true } },
        },
      });
      if (!operation) return failure("Operação não encontrada", 404);
      if (
        operation.asset.type !== input.assetType ||
        operation.asset.currency !== input.currency
      ) {
        return failure("Classe/moeda não correspondem à operação", 400);
      }
      if (input.assetId && operation.assetId !== input.assetId) {
        return failure("Ativo não corresponde à operação informada", 400);
      }
    }

    const created = await prisma.investmentTaxWithholding.create({
      data: {
        userId,
        assetType: input.assetType,
        currency: input.currency,
        amountCents: input.amountCents,
        year: input.year,
        month: input.month,
        day: input.day,
        assetId: input.assetId ?? null,
        operationId: input.operationId ?? null,
        source: "MANUAL",
        note: input.note ?? null,
      },
    });

    return success(created, "IRRF registrado com sucesso", 201);
  } catch (error) {
    return handleError(error, "Erro ao registrar IRRF");
  }
}

export async function createInvestmentTaxPayment(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = paymentSchema.parse(await parseJsonBody(request));

    if (input.currency !== "BRL") {
      return failure(
        "DARF deste controle fiscal aceita somente BRL. Investimentos no exterior exigem tratamento fiscal próprio.",
        400,
      );
    }

    if (!validDate(input.paidYear, input.paidMonth, input.paidDay)) {
      return failure("Data de pagamento inválida", 400);
    }

    const created = await prisma.investmentTaxPayment.create({
      data: {
        userId,
        assetType: input.assetType,
        currency: input.currency,
        amountCents: input.amountCents,
        competenceYear: input.competenceYear,
        competenceMonth: input.competenceMonth,
        code: input.code,
        paidYear: input.paidYear,
        paidMonth: input.paidMonth,
        paidDay: input.paidDay,
        note: input.note ?? null,
        receiptReference: input.receiptReference ?? null,
      },
    });

    return success(created, "DARF registrado com sucesso", 201);
  } catch (error) {
    return handleError(error, "Erro ao registrar DARF");
  }
}
