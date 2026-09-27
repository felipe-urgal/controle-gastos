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

export async function assertCardPurchaseStatementMutable(
  tx: Prisma.TransactionClient,
  userId: string,
  account: CardAccount,
  date: LogicalDate,
) {
  if (account.type !== "CREDIT_CARD") return;
  if (account.statementClosingDay === null || account.statementDueDay === null) {
    throw new HttpError("Configuração de cartão inválida", 409);
  }

  const cycle = resolveCreditCardStatementCycle({
    purchaseDate: date,
    statementClosingDay: account.statementClosingDay,
    statementDueDay: account.statementDueDay,
  });

  const payment = await tx.creditCardPayment.findFirst({
    where: {
      userId,
      cardAccountId: account.id,
      closingYear: cycle.closingDate.year,
      closingMonth: cycle.closingDate.month,
      closingDay: cycle.closingDate.day,
    },
    select: { id: true },
  });

  if (payment) {
    throw new HttpError(
      `Fatura ${statementKey(cycle.closingDate)} já foi paga e não pode ser alterada`,
      409,
      "CREDIT_CARD_STATEMENT_PAID",
    );
  }
}
