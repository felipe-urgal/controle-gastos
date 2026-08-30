import { TransactionStatus } from "@/app/types/transaction";
import {
  getMonthlyDateAtIndex,
  LogicalDate,
  MAX_MONTHLY_OCCURRENCES,
} from "@/app/lib/transactions/monthly-recurrence";

export type InstallmentOccurrence = LogicalDate & {
  index: number;
  amount: number;
  status: TransactionStatus;
};

export function splitInstallmentAmounts(totalCents: number, count: number) {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Valor total inválido");
  }

  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > MAX_MONTHLY_OCCURRENCES
  ) {
    throw new Error(
      `O parcelamento deve ter entre 2 e ${MAX_MONTHLY_OCCURRENCES} parcelas`
    );
  }

  const baseAmount = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  if (baseAmount <= 0) {
    throw new Error("O valor total deve permitir ao menos 1 centavo por parcela");
  }

  return Array.from({ length: count }, (_, index) =>
    baseAmount + (index < remainder ? 1 : 0)
  );
}

export function buildInstallmentOccurrences(args: {
  totalCents: number;
  count: number;
  start: LogicalDate;
  firstStatus: TransactionStatus;
}): InstallmentOccurrence[] {
  const amounts = splitInstallmentAmounts(args.totalCents, args.count);

  return amounts.map((amount, zeroBasedIndex) => ({
    ...getMonthlyDateAtIndex(args.start, zeroBasedIndex),
    index: zeroBasedIndex + 1,
    amount,
    status: zeroBasedIndex === 0 ? args.firstStatus : "PENDING",
  }));
}
