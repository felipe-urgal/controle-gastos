import type { Prisma } from '@prisma/client';

export async function syncTransactionSeriesMetadata(
  tx: Prisma.TransactionClient,
  userId: string,
  seriesId: string,
) {
  const series = await tx.transactionSeries.findFirst({
    where: { id: seriesId, userId },
    select: { id: true, type: true, endedAt: true },
  });
  if (!series) return;

  const occurrences = await tx.transaction.findMany({
    where: { userId, seriesId },
    select: {
      year: true,
      month: true,
      day: true,
    },
    orderBy: [
      { year: 'asc' },
      { month: 'asc' },
      { day: 'asc' },
      { seriesIndex: 'asc' },
    ],
  });

  if (occurrences.length === 0) {
    await tx.transactionSeries.updateMany({
      where: { id: seriesId, userId },
      data: {
        occurrenceCount: 0,
        sourceKey: null,
        ...(series.type === 'RECURRING' && series.endedAt === null
          ? { endedAt: new Date() }
          : {}),
      },
    });
    return;
  }

  const first = occurrences[0]!;
  const last = occurrences.at(-1)!;

  await tx.transactionSeries.updateMany({
    where: { id: seriesId, userId },
    data: {
      occurrenceCount: occurrences.length,
      startYear: first.year,
      startMonth: first.month,
      startDay: first.day,
      endYear: last.year,
      endMonth: last.month,
      endDay: last.day,
    },
  });
}
