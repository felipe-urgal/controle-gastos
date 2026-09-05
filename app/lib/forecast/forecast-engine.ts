import {
  compareLogicalDates,
  formatIsoLogicalDate,
  isValidLogicalDate,
  LogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";

export type ForecastHorizonDays = 30 | 60 | 90;

type ForecastTransactionType = "INCOME" | "EXPENSE";
type ForecastTransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type ForecastAccountInput = {
  id: string;
  name: string;
  balance: number;
};

export type ForecastTransactionInput = LogicalDate & {
  id: string;
  accountId: string;
  amount: number;
  type: ForecastTransactionType;
  status: ForecastTransactionStatus;
  description: string;
};

export type ForecastTimelinePoint = {
  date: LogicalDate;
  income: number;
  expense: number;
  delta: number;
  balance: number;
};

export type ForecastAccount = {
  id: string;
  name: string;
  realizedBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedBalance: number;
  lowestProjectedBalance: number;
  lowestProjectedBalanceDate: LogicalDate;
  timeline: ForecastTimelinePoint[];
};

export type OverdueForecastItem = ForecastTransactionInput;

export type ForecastResult = {
  asOf: LogicalDate;
  horizonDays: ForecastHorizonDays;
  horizonEnd: LogicalDate;
  accounts: ForecastAccount[];
  overdue: OverdueForecastItem[];
};

export function addLogicalDays(date: LogicalDate, days: number): LogicalDate {
  if (!isValidLogicalDate(date) || !Number.isInteger(days) || days < 0) {
    throw new Error("Data ou horizonte inválido");
  }

  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function validateAmount(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function dateOf(transaction: ForecastTransactionInput): LogicalDate {
  return {
    year: transaction.year,
    month: transaction.month,
    day: transaction.day,
  };
}

function compareForecastItems(
  left: ForecastTransactionInput,
  right: ForecastTransactionInput
) {
  const byDate = compareLogicalDates(dateOf(left), dateOf(right));
  if (byDate !== 0) return byDate;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function buildForecast(args: {
  asOf: LogicalDate;
  horizonDays: ForecastHorizonDays;
  accounts: readonly ForecastAccountInput[];
  transactions: readonly ForecastTransactionInput[];
}): ForecastResult {
  if (!isValidLogicalDate(args.asOf)) {
    throw new Error("Data de referência inválida");
  }

  if (![30, 60, 90].includes(args.horizonDays)) {
    throw new Error("Horizonte inválido");
  }

  const accountIds = new Set(args.accounts.map((account) => account.id));
  if (accountIds.size !== args.accounts.length) {
    throw new Error("Contas duplicadas na projeção");
  }

  for (const account of args.accounts) {
    if (!Number.isInteger(account.balance)) {
      throw new Error("Saldo realizado inválido");
    }
  }

  for (const transaction of args.transactions) {
    if (!accountIds.has(transaction.accountId)) {
      throw new Error("Transação de conta fora do escopo da projeção");
    }
    if (!isValidLogicalDate(dateOf(transaction)) || !validateAmount(transaction.amount)) {
      throw new Error("Transação inválida na projeção");
    }
  }

  const horizonEnd = addLogicalDays(args.asOf, args.horizonDays);
  const pending = args.transactions
    .filter((transaction) => transaction.status === "PENDING")
    .sort(compareForecastItems);

  const overdue = pending.filter(
    (transaction) => compareLogicalDates(dateOf(transaction), args.asOf) < 0
  );

  const future = pending.filter((transaction) => {
    const date = dateOf(transaction);
    return (
      compareLogicalDates(date, args.asOf) >= 0 &&
      compareLogicalDates(date, horizonEnd) <= 0
    );
  });

  const accounts = args.accounts.map((account): ForecastAccount => {
    const accountTransactions = future.filter(
      (transaction) => transaction.accountId === account.id
    );
    const byDate = new Map<
      string,
      { date: LogicalDate; income: number; expense: number }
    >();

    for (const transaction of accountTransactions) {
      const date = dateOf(transaction);
      const key = formatIsoLogicalDate(date);
      const point = byDate.get(key) ?? { date, income: 0, expense: 0 };

      if (transaction.type === "INCOME") {
        point.income += transaction.amount;
      } else {
        point.expense += transaction.amount;
      }

      byDate.set(key, point);
    }

    let balance = account.balance;
    let lowestProjectedBalance = balance;
    let lowestProjectedBalanceDate = args.asOf;
    let pendingIncome = 0;
    let pendingExpense = 0;

    const timeline = [...byDate.values()]
      .sort((left, right) => compareLogicalDates(left.date, right.date))
      .map((point): ForecastTimelinePoint => {
        pendingIncome += point.income;
        pendingExpense += point.expense;
        const delta = point.income - point.expense;
        balance += delta;

        if (balance < lowestProjectedBalance) {
          lowestProjectedBalance = balance;
          lowestProjectedBalanceDate = point.date;
        }

        return {
          date: point.date,
          income: point.income,
          expense: point.expense,
          delta,
          balance,
        };
      });

    return {
      id: account.id,
      name: account.name,
      realizedBalance: account.balance,
      pendingIncome,
      pendingExpense,
      projectedBalance: balance,
      lowestProjectedBalance,
      lowestProjectedBalanceDate,
      timeline,
    };
  });

  return {
    asOf: args.asOf,
    horizonDays: args.horizonDays,
    horizonEnd,
    accounts,
    overdue,
  };
}
