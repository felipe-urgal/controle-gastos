import type {
  FinancialCommitment,
  FinancialCommitmentDate,
} from '@/app/types/financial-commitment';

export function financialCommitmentDateKey(date: FinancialCommitmentDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

export function isFinancialCommitmentInRange(
  date: FinancialCommitmentDate,
  from: FinancialCommitmentDate,
  through: FinancialCommitmentDate,
) {
  const key = financialCommitmentDateKey(date);
  return key >= financialCommitmentDateKey(from) && key <= financialCommitmentDateKey(through);
}

export function sortFinancialCommitments(items: readonly FinancialCommitment[]) {
  return [...items].sort((left, right) => {
    const dateDifference =
      financialCommitmentDateKey(left.date) - financialCommitmentDateKey(right.date);
    if (dateDifference !== 0) return dateDifference;
    if (left.amount === null && right.amount !== null) return 1;
    if (left.amount !== null && right.amount === null) return -1;
    return left.title.localeCompare(right.title, 'pt-BR');
  });
}

export function summarizeFinancialCommitments(items: readonly FinancialCommitment[]) {
  return items.reduce(
    (result, item) => {
      if (item.amount === null) {
        result.milestoneCount += 1;
      } else {
        result.monetaryCount += 1;
        result.monetaryAmount += item.amount;
      }
      return result;
    },
    { monetaryCount: 0, monetaryAmount: 0, milestoneCount: 0 },
  );
}
