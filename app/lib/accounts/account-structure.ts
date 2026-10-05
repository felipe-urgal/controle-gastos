import type { Account, Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { updateAccountSchema } from "@/app/lib/accounts/account-schema";
import { HttpError } from "@/app/lib/http-error";

type AccountUpdate = z.infer<typeof updateAccountSchema>;
type AccountDb = PrismaClient | Prisma.TransactionClient;

export type AccountFinancialUsage = {
  transactions: number;
  investmentOperations: number;
  investmentIncomes: number;
  investmentFiscalEvents: number;
  cardPayments: number;
};

export async function getAccountFinancialUsage(
  db: AccountDb,
  userId: string,
  accountId: string,
): Promise<AccountFinancialUsage> {
  const [
    transactions,
    investmentOperations,
    investmentIncomes,
    investmentFiscalEvents,
    cardPayments,
  ] = await Promise.all([
    db.transaction.count({ where: { userId, accountId } }),
    db.investmentOperation.count({ where: { userId, accountId } }),
    db.investmentIncome.count({ where: { userId, accountId } }),
    db.investmentFiscalEvent.count({ where: { userId, accountId } }),
    db.creditCardPayment.count({
      where: {
        userId,
        OR: [{ cardAccountId: accountId }, { sourceAccountId: accountId }],
      },
    }),
  ]);

  return {
    transactions,
    investmentOperations,
    investmentIncomes,
    investmentFiscalEvents,
    cardPayments,
  };
}

function hasFinancialHistory(usage: AccountFinancialUsage) {
  return Object.values(usage).some((count) => count > 0);
}

export function assertAccountStructuralChangeAllowed(
  data: AccountUpdate,
  entity: Pick<
    Account,
    "type" | "currency" | "statementClosingDay" | "statementDueDay"
  >,
  usage: AccountFinancialUsage,
) {
  const typeChanged = data.type !== undefined && data.type !== entity.type;
  const currencyChanged =
    data.currency !== undefined && data.currency !== entity.currency;
  const cardCycleChanged =
    (data.statementClosingDay !== undefined &&
      data.statementClosingDay !== entity.statementClosingDay) ||
    (data.statementDueDay !== undefined &&
      data.statementDueDay !== entity.statementDueDay);

  if (!hasFinancialHistory(usage)) return;

  const touchesCard =
    entity.type === "CREDIT_CARD" || data.type === "CREDIT_CARD";
  if (touchesCard && (typeChanged || currencyChanged || cardCycleChanged)) {
    throw new HttpError(
      "Tipo, moeda e ciclo do cartão não podem ser alterados após movimentações",
      409,
      "CREDIT_CARD_STRUCTURE_LOCKED",
    );
  }

  const touchesInvestment =
    entity.type === "INVESTMENT" || data.type === "INVESTMENT";
  if (touchesInvestment && (typeChanged || currencyChanged)) {
    throw new HttpError(
      "Tipo e moeda da conta de investimento não podem ser alterados após dados financeiros",
      409,
      "INVESTMENT_ACCOUNT_STRUCTURE_LOCKED",
    );
  }

  if (typeChanged || currencyChanged) {
    throw new HttpError(
      "Tipo e moeda da conta não podem ser alterados após movimentações",
      409,
      "ACCOUNT_STRUCTURE_LOCKED",
    );
  }
}
