import type {
  FinancialCommitment,
  FinancialCommitmentDate,
  FinancialCommitmentTotals,
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

export function isFinancialCommitmentVisible(
  date: FinancialCommitmentDate,
  through: FinancialCommitmentDate,
) {
  return financialCommitmentDateKey(date) <= financialCommitmentDateKey(through);
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

export function summarizeFinancialCommitments(
  items: readonly FinancialCommitment[],
): FinancialCommitmentTotals {
  return items.reduce<FinancialCommitmentTotals>(
    (result, item) => {
      if (item.state === 'OVERDUE') {
        result.overdueCount += 1;
      }

      if (item.direction === 'MILESTONE' || item.amount === null) {
        result.milestoneCount += 1;
        return result;
      }

      if (item.direction === 'PAYABLE') {
        result.payable.count += 1;
        result.payable.amount += item.amount;
        return result;
      }

      result.receivable.count += 1;
      result.receivable.amount += item.amount;
      return result;
    },
    {
      payable: { count: 0, amount: 0 },
      receivable: { count: 0, amount: 0 },
      milestoneCount: 0,
      overdueCount: 0,
    },
  );
}
