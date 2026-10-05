import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { resolveCreditCardStatementCycle } from "@/app/lib/accounts/credit-card-cycle";
import {
  compareLogicalDates,
  getLastDayOfMonth,
  parseIsoLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import type { PayCreditCardStatementInput } from "@/app/lib/cards/credit-card-payment-schema";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new HttpError("Chave de idempotência inválida", 400);
  }
  return normalized;
}

function requestHash(cardId: string, input: PayCreditCardStatementInput) {
  return sha256(
    JSON.stringify({
      cardId,
      sourceAccountId: input.sourceAccountId,
      statementClosingDate: input.statementClosingDate,
      paymentDate: input.paymentDate,
    }),
  );
}

function monthOffset(date: LogicalDate, offset: number) {
  const value = new Date(Date.UTC(date.year, date.month - 1 + offset, 1));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  };
}

function statementWhereDate(date: LogicalDate) {
  return {
    closingYear: date.year,
    closingMonth: date.month,
    closingDay: date.day,
  };
}

function assertClosingDateMatchesCard(
  closingDate: LogicalDate,
  statementClosingDay: number,
) {
  const expectedDay = Math.min(
    statementClosingDay,
    getLastDayOfMonth(closingDate.year, closingDate.month),
  );
  if (closingDate.day !== expectedDay) {
    throw new HttpError("Fechamento não corresponde ao ciclo do cartão", 400);
  }
}

async function findPaymentByKey(
  db: Pick<Prisma.TransactionClient, "creditCardPayment">,
  userId: string,
  idempotencyKeyHash: string,
) {
  return db.creditCardPayment.findFirst({
    where: { userId, idempotencyKeyHash },
    include: {
      sourceTransaction: true,
    },
  });
}

function replayResult(payment: Awaited<ReturnType<typeof findPaymentByKey>>) {
  if (!payment) throw new Error("Pagamento inexistente");
  return {
    id: payment.id,
    amount: payment.amount,
    statementClosingDate: {
      year: payment.closingYear,
      month: payment.closingMonth,
      day: payment.closingDay,
    },
    sourceAccountId: payment.sourceAccountId,
    sourceTransactionId: payment.sourceTransactionId,
    paymentDate: {
      year: payment.sourceTransaction.year,
      month: payment.sourceTransaction.month,
      day: payment.sourceTransaction.day,
    },
    replayed: true,
  };
}

export async function payCreditCardStatementForUser(
  userId: string,
  cardId: string,
  input: PayCreditCardStatementInput,
  idempotencyKey: string,
) {
  const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
  const idempotencyKeyHash = sha256(normalizedKey);
  const expectedRequestHash = requestHash(cardId, input);
  const closingDate = parseIsoLogicalDate(input.statementClosingDate);
  const paymentDate = parseIsoLogicalDate(input.paymentDate);

  if (!closingDate) throw new HttpError("Fechamento inválido", 400);
  if (!paymentDate) throw new HttpError("Data de pagamento inválida", 400);
  if (compareLogicalDates(paymentDate, closingDate) < 0) {
    throw new HttpError(
      "A fatura só pode ser paga a partir da data de fechamento",
      400,
    );
  }

  const existingByKey = await findPaymentByKey(
    prisma,
    userId,
    idempotencyKeyHash,
  );
  if (existingByKey) {
    if (existingByKey.requestHash !== expectedRequestHash) {
      throw new HttpError(
        "Chave de idempotência já utilizada com outro pagamento",
        409,
      );
    }
    return replayResult(existingByKey);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const card = await tx.account.findFirst({
        where: { id: cardId, userId, type: "CREDIT_CARD" },
      });
      const source = await tx.account.findFirst({
        where: {
          id: input.sourceAccountId,
          userId,
          isActive: true,
          type: { not: "CREDIT_CARD" },
        },
      });

      if (
        !card ||
        card.creditLimit === null ||
        card.statementClosingDay === null ||
        card.statementDueDay === null
      ) {
        throw new HttpError("Cartão não encontrado", 404);
      }
      if (!source) {
        throw new HttpError("Conta pagadora inválida ou inativa", 400);
      }
      if (source.currency !== card.currency) {
        throw new HttpError(
          "Conta pagadora deve usar a mesma moeda do cartão",
          400,
          "CREDIT_CARD_PAYMENT_CURRENCY_MISMATCH",
        );
      }

      assertClosingDateMatchesCard(closingDate, card.statementClosingDay);

      const alreadyPaid = await tx.creditCardPayment.findFirst({
        where: {
          userId,
          cardAccountId: card.id,
          ...statementWhereDate(closingDate),
        },
        select: { id: true },
      });
      if (alreadyPaid) {
        throw new HttpError("Esta fatura já foi paga", 409, "CREDIT_CARD_STATEMENT_ALREADY_PAID");
      }

      const earliestMonth = monthOffset(closingDate, -2);
      const purchases = await tx.transaction.findMany({
        where: {
          userId,
          accountId: card.id,
          kind: "NORMAL",
          status: { not: "CANCELLED" },
          OR: [
            { year: { gt: earliestMonth.year } },
            {
              year: earliestMonth.year,
              month: { gte: earliestMonth.month },
            },
          ],
        },
        select: {
          id: true,
          amount: true,
          type: true,
          year: true,
          month: true,
          day: true,
        },
      });

      const statementPurchases = purchases.filter((purchase) => {
        const cycle = resolveCreditCardStatementCycle({
          purchaseDate: {
            year: purchase.year,
            month: purchase.month,
            day: purchase.day,
          },
          statementClosingDay: card.statementClosingDay!,
          statementDueDay: card.statementDueDay!,
        });
        return (
          cycle.closingDate.year === closingDate.year &&
          cycle.closingDate.month === closingDate.month &&
          cycle.closingDate.day === closingDate.day
        );
      });

      const amount = statementPurchases.reduce(
        (sum, purchase) =>
          sum + (purchase.type === "INCOME" ? -purchase.amount : purchase.amount),
        0,
      );
      if (amount <= 0) {
        throw new HttpError("Fatura não possui valor a pagar", 400);
      }

      const sourceTransaction = await tx.transaction.create({
        data: {
          amount,
          year: paymentDate.year,
          month: paymentDate.month,
          day: paymentDate.day,
          type: "EXPENSE",
          kind: "CARD_PAYMENT",
          description: `Pagamento fatura ${card.name}`,
          status: "COMPLETED",
          accountId: source.id,
          categoryId: null,
          userId,
        },
      });

      const payment = await tx.creditCardPayment.create({
        data: {
          amount,
          closingYear: closingDate.year,
          closingMonth: closingDate.month,
          closingDay: closingDate.day,
          idempotencyKeyHash,
          requestHash: expectedRequestHash,
          userId,
          cardAccountId: card.id,
          sourceAccountId: source.id,
          sourceTransactionId: sourceTransaction.id,
        },
      });

      return {
        id: payment.id,
        amount,
        statementClosingDate: closingDate,
        sourceAccountId: source.id,
        sourceTransactionId: sourceTransaction.id,
        paymentDate,
        replayed: false,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await findPaymentByKey(prisma, userId, idempotencyKeyHash);
      if (replay) {
        if (replay.requestHash !== expectedRequestHash) {
          throw new HttpError(
            "Chave de idempotência já utilizada com outro pagamento",
            409,
          );
        }
        return replayResult(replay);
      }

      throw new HttpError(
        "Esta fatura já foi paga",
        409,
        "CREDIT_CARD_STATEMENT_ALREADY_PAID",
      );
    }
    throw error;
  }
}
