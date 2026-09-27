import { compareLogicalDates, formatIsoLogicalDate, type LogicalDate } from "@/app/lib/date/logical-date";
import { buildCreditCardStatements, type CreditCardStatementTransaction } from "@/app/lib/cards/credit-card-statements";

export type CreditCardCommitmentCard = {
  id: string;
  name: string;
  statementClosingDay: number;
  statementDueDay: number;
};

export type CreditCardCommitmentPayment = {
  cardAccountId: string;
  closingYear: number;
  closingMonth: number;
  closingDay: number;
};

export type CreditCardCommitment = {
  cardId: string;
  cardName: string;
  amount: number;
  closingDate: LogicalDate;
  dueDate: LogicalDate;
  transactionCount: number;
};

function paymentKey(cardId: string, date: LogicalDate) {
  return `${cardId}:${formatIsoLogicalDate(date)}`;
}

function compareCommitments(
  left: CreditCardCommitment,
  right: CreditCardCommitment,
) {
  const byDueDate = compareLogicalDates(left.dueDate, right.dueDate);
  if (byDueDate !== 0) return byDueDate;
  return left.cardName.localeCompare(right.cardName);
}

export function buildCreditCardCommitments(args: {
  asOf: LogicalDate;
  historyLimit?: number;
  cards: readonly CreditCardCommitmentCard[];
  transactionsByCard: ReadonlyMap<string, readonly CreditCardStatementTransaction[]>;
  payments: readonly CreditCardCommitmentPayment[];
}) {
  const paid = new Set(
    args.payments.map((payment) =>
      paymentKey(payment.cardAccountId, {
        year: payment.closingYear,
        month: payment.closingMonth,
        day: payment.closingDay,
      }),
    ),
  );

  const commitments: CreditCardCommitment[] = [];

  for (const card of args.cards) {
    const statements = buildCreditCardStatements({
      asOf: args.asOf,
      statementClosingDay: card.statementClosingDay,
      statementDueDay: card.statementDueDay,
      transactions: args.transactionsByCard.get(card.id) ?? [],
      historyLimit: args.historyLimit ?? 24,
    });

    for (const statement of [
      ...statements.history,
      statements.current,
      ...statements.future,
    ]) {
      if (
        statement.total <= 0 ||
        paid.has(paymentKey(card.id, statement.closingDate))
      ) {
        continue;
      }

      commitments.push({
        cardId: card.id,
        cardName: card.name,
        amount: statement.total,
        closingDate: statement.closingDate,
        dueDate: statement.dueDate,
        transactionCount: statement.transactionCount,
      });
    }
  }

  return commitments.sort(compareCommitments);
}
