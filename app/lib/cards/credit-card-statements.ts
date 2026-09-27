import {
  compareLogicalDates,
  formatIsoLogicalDate,
  isValidLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { resolveCreditCardStatementCycle } from "@/app/lib/accounts/credit-card-cycle";

export type CreditCardStatementTransaction = LogicalDate & {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  description: string;
  seriesId?: string | null;
  seriesIndex?: number | null;
};

export type CreditCardStatement = {
  closingDate: LogicalDate;
  dueDate: LogicalDate;
  total: number;
  completedTotal: number;
  pendingTotal: number;
  transactionCount: number;
  transactions: CreditCardStatementTransaction[];
};

export type CreditCardStatementsResult = {
  current: CreditCardStatement;
  future: CreditCardStatement[];
  history: CreditCardStatement[];
};

function emptyStatement(cycle: { closingDate: LogicalDate; dueDate: LogicalDate }) {
  return {
    ...cycle,
    total: 0,
    completedTotal: 0,
    pendingTotal: 0,
    transactionCount: 0,
    transactions: [],
  } satisfies CreditCardStatement;
}

function compareStatement(left: CreditCardStatement, right: CreditCardStatement) {
  return compareLogicalDates(left.closingDate, right.closingDate);
}

export function buildCreditCardStatements(args: {
  asOf: LogicalDate;
  statementClosingDay: number;
  statementDueDay: number;
  transactions: readonly CreditCardStatementTransaction[];
  historyLimit?: number;
}): CreditCardStatementsResult {
  if (!isValidLogicalDate(args.asOf)) {
    throw new Error("Data de referência inválida");
  }

  const historyLimit = args.historyLimit ?? 12;
  if (!Number.isInteger(historyLimit) || historyLimit < 0 || historyLimit > 24) {
    throw new Error("Limite de histórico inválido");
  }

  const currentCycle = resolveCreditCardStatementCycle({
    purchaseDate: args.asOf,
    statementClosingDay: args.statementClosingDay,
    statementDueDay: args.statementDueDay,
  });
  const currentKey = formatIsoLogicalDate(currentCycle.closingDate);
  const statements = new Map<string, CreditCardStatement>([
    [currentKey, emptyStatement(currentCycle)],
  ]);

  for (const transaction of args.transactions) {
    if (
      transaction.status === "CANCELLED" ||
      transaction.type !== "EXPENSE"
    ) {
      continue;
    }

    if (
      !isValidLogicalDate(transaction) ||
      !Number.isInteger(transaction.amount) ||
      transaction.amount <= 0
    ) {
      throw new Error("Transação de cartão inválida");
    }

    const cycle = resolveCreditCardStatementCycle({
      purchaseDate: transaction,
      statementClosingDay: args.statementClosingDay,
      statementDueDay: args.statementDueDay,
    });
    const key = formatIsoLogicalDate(cycle.closingDate);
    const statement = statements.get(key) ?? emptyStatement(cycle);

    statement.total += transaction.amount;
    if (transaction.status === "COMPLETED") {
      statement.completedTotal += transaction.amount;
    } else {
      statement.pendingTotal += transaction.amount;
    }
    statement.transactionCount += 1;
    statement.transactions.push(transaction);
    statements.set(key, statement);
  }

  for (const statement of statements.values()) {
    statement.transactions.sort((left, right) => {
      const byDate = compareLogicalDates(left, right);
      if (byDate !== 0) return byDate;
      return left.id.localeCompare(right.id);
    });
  }

  const ordered = [...statements.values()].sort(compareStatement);
  const current =
    ordered.find(
      (statement) => formatIsoLogicalDate(statement.closingDate) === currentKey,
    ) ?? emptyStatement(currentCycle);

  const future = ordered.filter(
    (statement) => compareLogicalDates(statement.closingDate, current.closingDate) > 0,
  );
  const history = ordered
    .filter(
      (statement) => compareLogicalDates(statement.closingDate, current.closingDate) < 0,
    )
    .sort((left, right) => compareStatement(right, left))
    .slice(0, historyLimit);

  return { current, future, history };
}
