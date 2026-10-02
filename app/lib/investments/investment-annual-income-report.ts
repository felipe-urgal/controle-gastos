import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { formatInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const FISCALLY_CLASSIFIED_INCOME_TYPES = new Set(["DIVIDEND", "INTEREST"]);

function dateFromParts(value: { year: number; month: number; day: number }) {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export async function getInvestmentAnnualIncomeReportForUser(
  userId: string,
  year: number,
) {
  const incomes = await prisma.investmentIncome.findMany({
    where: { userId, year },
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
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
    },
    orderBy: [
      { month: "asc" },
      { day: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  const groups = new Map<
    string,
    {
      assetId: string;
      symbol: string;
      name: string | null;
      assetType: string;
      currency: string;
      incomeType: string;
      institutionId: string;
      institutionName: string;
      eventCount: number;
      netAmountCents: number;
      pending: Array<{
        code: "UNCLASSIFIED_INCOME_TYPE";
        message: string;
      }>;
      events: Array<{
        id: string;
        date: string;
        quantity: string;
        unitValueCents: number;
        netAmountCents: number;
        note: string | null;
      }>;
    }
  >();

  for (const income of incomes) {
    const key = [
      income.assetId,
      income.type,
      income.accountId,
      income.asset.currency,
    ].join("|");
    const current = groups.get(key) ?? {
      assetId: income.asset.id,
      symbol: income.asset.symbol,
      name: income.asset.name,
      assetType: income.asset.type,
      currency: income.asset.currency,
      incomeType: income.type,
      institutionId: income.account.id,
      institutionName: income.account.name,
      eventCount: 0,
      netAmountCents: 0,
      pending: [],
      events: [],
    };

    current.eventCount += 1;
    current.netAmountCents += income.netAmountCents;
    current.events.push({
      id: income.id,
      date: dateFromParts(income),
      quantity: formatInvestmentQuantity(income.quantityUnits),
      unitValueCents: income.unitValueCents,
      netAmountCents: income.netAmountCents,
      note: income.note,
    });

    if (
      !FISCALLY_CLASSIFIED_INCOME_TYPES.has(income.type) &&
      current.pending.length === 0
    ) {
      current.pending.push({
        code: "UNCLASSIFIED_INCOME_TYPE",
        message:
          income.type === "INCOME"
            ? "Rendimento importado sem classificação fiscal específica. Revise se é dividendo, juros ou outro tratamento."
            : "Rendimento classificado como outro exige revisão fiscal antes do relatório final.",
      });
    }

    groups.set(key, current);
  }

  const items = [...groups.values()].sort((left, right) => {
    const currency = left.currency.localeCompare(right.currency);
    if (currency !== 0) return currency;
    const symbol = left.symbol.localeCompare(right.symbol);
    if (symbol !== 0) return symbol;
    const type = left.incomeType.localeCompare(right.incomeType);
    if (type !== 0) return type;
    return left.institutionName.localeCompare(right.institutionName);
  });

  const totalsByCurrency = incomes.reduce<Record<string, number>>(
    (totals, income) => {
      totals[income.asset.currency] =
        (totals[income.asset.currency] ?? 0) + income.netAmountCents;
      return totals;
    },
    {},
  );

  const totalsByTypeAndCurrency = items.reduce<
    Record<string, Record<string, number>>
  >((totals, item) => {
    totals[item.currency] ??= {};
    totals[item.currency][item.incomeType] =
      (totals[item.currency][item.incomeType] ?? 0) + item.netAmountCents;
    return totals;
  }, {});

  const pending = items.flatMap((item) =>
    item.pending.map((issue) => ({
      ...issue,
      assetId: item.assetId,
      symbol: item.symbol,
      incomeType: item.incomeType,
      institutionId: item.institutionId,
      institutionName: item.institutionName,
    })),
  );

  return {
    year,
    eventCount: incomes.length,
    groupCount: items.length,
    totalsByCurrency,
    totalsByTypeAndCurrency,
    status: pending.length === 0 ? ("OK" as const) : ("PENDING" as const),
    pending,
    items,
  };
}

export async function getInvestmentAnnualIncomeReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getInvestmentAnnualIncomeReportForUser(userId, input.year),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao consolidar rendimentos de investimentos", 500);
  }
}
