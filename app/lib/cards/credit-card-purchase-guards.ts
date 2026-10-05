import type { Prisma } from "@prisma/client";

import { resolveCreditCardStatementCycle } from "@/app/lib/accounts/credit-card-cycle";
import { formatIsoLogicalDate, type LogicalDate } from "@/app/lib/date/logical-date";
import { HttpError } from "@/app/lib/http-error";

type CardAccount = {
  id: string;
  type: "CREDIT_DEBIT" | "INVESTMENT" | "CREDIT_CARD";
  statementClosingDay: number | null;
  statementDueDay: number | null;
};

function statementKey(date: LogicalDate) {
  return formatIsoLogicalDate(date);
}

export async function lockCreditCardAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "accounts"
    WHERE "id" = ${accountId} AND "userId" = ${userId}
    FOR UPDATE
  `;

  if (rows.length !== 1) {
    throw new HttpError("Cartão não encontrado", 404);
  }
}

export async function assertCardPurchaseStatementsMutable(
  tx: Prisma.TransactionClient,
  userId: string,
  account: CardAccount,
  dates: readonly LogicalDate[],
) {
  if (account.type !== "CREDIT_CARD" || dates.length === 0) return;
  if (account.statementClosingDay === null || account.statementDueDay === null) {
    throw new HttpError("Configuração de cartão inválida", 409);
  }

  await lockCreditCardAccount(tx, userId, account.id);

  const cycles = new Map<string, LogicalDate>();
  for (const date of dates) {
    const cycle = resolveCreditCardStatementCycle({
      purchaseDate: date,
      statementClosingDay: account.statementClosingDay,
      statementDueDay: account.statementDueDay,
    });
    cycles.set(statementKey(cycle.closingDate), cycle.closingDate);
  }

  const closingDates = [...cycles.values()];
  const payment = await tx.creditCardPayment.findFirst({
    where: {
      userId,
      cardAccountId: account.id,
      OR: closingDates.map((closingDate) => ({
        closingYear: closingDate.year,
        closingMonth: closingDate.month,
        closingDay: closingDate.day,
      })),
    },
    select: {
      closingYear: true,
      closingMonth: true,
      closingDay: true,
    },
  });

  if (payment) {
    throw new HttpError(
      `Fatura ${statementKey({ year: payment.closingYear, month: payment.closingMonth, day: payment.closingDay })} já foi paga e não pode ser alterada`,
      409,
      "CREDIT_CARD_STATEMENT_PAID",
    );
  }
}

export async function assertCardPurchaseStatementMutable(
  tx: Prisma.TransactionClient,
  userId: string,
  account: CardAccount,
  date: LogicalDate,
) {
  return assertCardPurchaseStatementsMutable(tx, userId, account, [date]);
}
