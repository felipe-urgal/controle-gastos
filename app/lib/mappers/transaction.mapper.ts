import { Transaction } from "@prisma/client";

export function toTransactionDTO(
  transaction: Transaction & { account?: any; category?: any; series?: any }
) {
  const series = transaction.series
    ? {
        id: transaction.series.id,
        type: transaction.series.type,
        frequency: transaction.series.frequency,
        description: transaction.series.description,
        anchorDay: transaction.series.anchorDay,
        occurrenceCount: transaction.series.occurrenceCount,
        start: {
          year: transaction.series.startYear,
          month: transaction.series.startMonth,
          day: transaction.series.startDay,
        },
        end: {
          year: transaction.series.endYear,
          month: transaction.series.endMonth,
          day: transaction.series.endDay,
        },
      }
    : null;

  return {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    description: transaction.description,
    status: transaction.status,
    year: transaction.year,
    month: transaction.month,
    day: transaction.day,
    account: transaction.account,
    category: transaction.category,
    series,
    seriesIndex: transaction.seriesIndex,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
};
