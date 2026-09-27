import { ZodError, z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { parseIsoLogicalDate, type LogicalDate } from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";
import { buildCreditCardStatements } from "@/app/lib/cards/credit-card-statements";

const querySchema = z.object({
  asOf: z.string().optional(),
  history: z.coerce.number().int().min(0).max(24).default(12),
});

function todayUtc(): LogicalDate {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

function monthOffset(date: LogicalDate, offset: number) {
  const value = new Date(Date.UTC(date.year, date.month - 1 + offset, 1));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  };
}

export async function getCreditCardStatements(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Cartão não encontrado", 404);

    const { id } = await context.params;
    const url = new URL(request.url);
    const query = querySchema.parse({
      asOf: url.searchParams.get("asOf") ?? undefined,
      history: url.searchParams.get("history") ?? undefined,
    });
    const asOf = query.asOf ? parseIsoLogicalDate(query.asOf) : todayUtc();
    if (!asOf) return failure("Data de referência inválida", 400);

    const account = await prisma.account.findFirst({
      where: { id, userId, type: "CREDIT_CARD" },
      select: {
        id: true,
        name: true,
        currency: true,
        isActive: true,
        creditLimit: true,
        statementClosingDay: true,
        statementDueDay: true,
      },
    });

    if (
      !account ||
      account.creditLimit === null ||
      account.statementClosingDay === null ||
      account.statementDueDay === null
    ) {
      return failure("Cartão não encontrado", 404);
    }

    const earliest = monthOffset(asOf, -(query.history + 2));
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        accountId: account.id,
        kind: "NORMAL",
        type: "EXPENSE",
        status: { not: "CANCELLED" },
        OR: [
          { year: { gt: earliest.year } },
          { year: earliest.year, month: { gte: earliest.month } },
        ],
      },
      select: {
        id: true,
        amount: true,
        year: true,
        month: true,
        day: true,
        type: true,
        status: true,
        description: true,
        seriesId: true,
        seriesIndex: true,
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { id: "asc" },
      ],
    });

    const statements = buildCreditCardStatements({
      asOf,
      statementClosingDay: account.statementClosingDay,
      statementDueDay: account.statementDueDay,
      transactions,
      historyLimit: query.history,
    });

    return success({
      card: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        isActive: account.isActive,
        creditLimit: account.creditLimit,
        statementClosingDay: account.statementClosingDay,
        statementDueDay: account.statementDueDay,
      },
      asOf,
      ...statements,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Consulta inválida", 400);
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao carregar faturas do cartão", 500);
  }
}
