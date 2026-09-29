import { ZodError, z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
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
    const [transactions, purchaseAggregate, paymentAggregate, payments] = await Promise.all([
      prisma.transaction.findMany({
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
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          accountId: account.id,
          kind: "NORMAL",
          type: "EXPENSE",
          status: { not: "CANCELLED" },
        },
        _sum: { amount: true },
      }),
      prisma.creditCardPayment.aggregate({
        where: { userId, cardAccountId: account.id },
        _sum: { amount: true },
      }),
      prisma.creditCardPayment.findMany({
        where: {
          userId,
          cardAccountId: account.id,
          OR: [
            { closingYear: { gt: earliest.year } },
            {
              closingYear: earliest.year,
              closingMonth: { gte: earliest.month },
            },
          ],
        },
        select: {
          id: true,
          amount: true,
          closingYear: true,
          closingMonth: true,
          closingDay: true,
          sourceAccountId: true,
          sourceTransactionId: true,
          createdAt: true,
        },
        orderBy: [
          { closingYear: "desc" },
          { closingMonth: "desc" },
          { closingDay: "desc" },
        ],
      }),
    ]);

    const statements = buildCreditCardStatements({
      asOf,
      statementClosingDay: account.statementClosingDay,
      statementDueDay: account.statementDueDay,
      transactions,
      historyLimit: query.history,
    });

    const paymentByStatement = new Map(
      payments.map((payment) => [
        `${payment.closingYear}-${String(payment.closingMonth).padStart(2, "0")}-${String(payment.closingDay).padStart(2, "0")}`,
        {
          id: payment.id,
          amount: payment.amount,
          sourceAccountId: payment.sourceAccountId,
          sourceTransactionId: payment.sourceTransactionId,
          paidAt: payment.createdAt.toISOString(),
        },
      ]),
    );

    const decorateStatement = (statement: typeof statements.current) => {
      const key = `${statement.closingDate.year}-${String(statement.closingDate.month).padStart(2, "0")}-${String(statement.closingDate.day).padStart(2, "0")}`;
      const payment = paymentByStatement.get(key) ?? null;
      return {
        ...statement,
        status: payment ? "PAID" as const : "OPEN" as const,
        payment,
      };
    };

    const purchaseTotal = purchaseAggregate._sum.amount ?? 0;
    const paidTotal = paymentAggregate._sum.amount ?? 0;
    const usedLimit = Math.max(0, purchaseTotal - paidTotal);
    const availableLimit = Math.max(0, account.creditLimit - usedLimit);
    const overLimit = Math.max(0, usedLimit - account.creditLimit);

    return success({
      card: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        isActive: account.isActive,
        creditLimit: account.creditLimit,
        usedLimit,
        availableLimit,
        overLimit,
        statementClosingDay: account.statementClosingDay,
        statementDueDay: account.statementDueDay,
      },
      asOf,
      current: decorateStatement(statements.current),
      future: statements.future.map(decorateStatement),
      history: statements.history.map(decorateStatement),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Consulta inválida", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao carregar faturas do cartão", 500);
  }
}
