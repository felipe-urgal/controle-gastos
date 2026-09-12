import { Transaction } from "@prisma/client";

type TransactionRelations = {
  account?: any;
  category?: any;
  series?: any;
  transfer?: {
    transactions?: Array<{
      id: string;
      userId?: string | null;
      transferRole?: string | null;
      account?: any;
    }>;
  } | null;
};

export function toTransactionDTO(
  transaction: Transaction & TransactionRelations
) {
  const series = transaction.series
    ? {
        id: transaction.series.id,
        type: transaction.series.type,
        frequency: transaction.series.frequency,
        interval: transaction.series.interval,
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

  const counterpartAccount = transaction.kind === "TRANSFER"
    ? transaction.transfer?.transactions?.find(
        (candidate) =>
          candidate.id !== transaction.id &&
          candidate.userId === transaction.userId &&
          candidate.transferRole !== transaction.transferRole,
      )?.account ?? null
    : null;

  return {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    kind: transaction.kind,
    description: transaction.description,
    status: transaction.status,
    reconciliationStatus: transaction.reconciliationStatus,
    reconciledAt: transaction.reconciledAt?.toISOString() ?? null,
    year: transaction.year,
    month: transaction.month,
    day: transaction.day,
    account: transaction.account,
    category: transaction.category,
    series,
    seriesIndex: transaction.seriesIndex,
    transferId: transaction.transferId,
    transferRole: transaction.transferRole,
    counterpartAccount,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
};
