import { withDerivedAccountBalances } from "@/app/lib/accounts/account-balance";
import {
  buildForecast,
  type ForecastResult,
} from "@/app/lib/forecast/forecast-engine";
import { prisma } from "@/app/lib/prisma";
import type { ForecastQueryInput } from "@/app/schemas/forecast.schema";
import type { LogicalDate } from "@/app/lib/transactions/monthly-recurrence";

export type ForecastForUserResult = ForecastResult & {
  currency: ForecastQueryInput["currency"];
};

export function logicalDateFromUtcInstant(now: Date): LogicalDate {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Instante de referência inválido");
  }

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

export async function getForecastForUser(
  userId: string,
  input: ForecastQueryInput,
  now: Date = new Date()
): Promise<ForecastForUserResult> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
      currency: input.currency,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  const accountsWithBalances = await withDerivedAccountBalances(accounts, userId);
  const accountIds = accountsWithBalances.map((account) => account.id);

  const transactions =
    accountIds.length === 0
      ? []
      : await prisma.transaction.findMany({
          where: {
            userId,
            status: "PENDING",
            accountId: { in: accountIds },
            account: {
              is: {
                userId,
                isActive: true,
                currency: input.currency,
              },
            },
          },
          select: {
            id: true,
            accountId: true,
            amount: true,
            type: true,
            status: true,
            description: true,
            year: true,
            month: true,
            day: true,
          },
          orderBy: [
            { year: "asc" },
            { month: "asc" },
            { day: "asc" },
            { id: "asc" },
          ],
        });

  return {
    currency: input.currency,
    ...buildForecast({
      asOf: logicalDateFromUtcInstant(now),
      horizonDays: input.days,
      accounts: accountsWithBalances.map((account) => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
      })),
      transactions,
    }),
  };
}
