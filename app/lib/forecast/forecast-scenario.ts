import {
  compareLogicalDates,
  formatIsoLogicalDate,
  isValidLogicalDate,
} from '@/app/lib/date/logical-date';
import type {
  ForecastAccount,
  ForecastData,
  ForecastLogicalDate,
  ForecastTimelinePoint,
} from '@/app/types/forecast';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ForecastScenarioMovement = ForecastLogicalDate & {
  id: string;
  accountId: string;
  currency: SupportedCurrency;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
};

export type ForecastScenarioResult = {
  accounts: ForecastAccount[];
  appliedMovements: ForecastScenarioMovement[];
  outsideHorizon: ForecastScenarioMovement[];
};

function movementDate(movement: ForecastScenarioMovement): ForecastLogicalDate {
  return {
    year: movement.year,
    month: movement.month,
    day: movement.day,
  };
}

function validateMovement(data: ForecastData, movement: ForecastScenarioMovement) {
  if (movement.currency !== data.currency) {
    throw new Error('Cenário com moeda incompatível com a projeção');
  }

  if (!data.accounts.some((account) => account.id === movement.accountId)) {
    throw new Error('Cenário de conta fora do escopo da projeção');
  }

  if (
    !Number.isInteger(movement.amount) ||
    movement.amount <= 0 ||
    !isValidLogicalDate(movementDate(movement))
  ) {
    throw new Error('Movimento hipotético inválido');
  }

  if (compareLogicalDates(movementDate(movement), data.asOf) < 0) {
    throw new Error('Cenário não pode ocorrer antes da data de referência');
  }
}

function rebuildAccount(
  account: ForecastAccount,
  movements: readonly ForecastScenarioMovement[],
  asOf: ForecastLogicalDate,
): ForecastAccount {
  const byDate = new Map<string, ForecastTimelinePoint>();

  for (const point of account.timeline) {
    byDate.set(formatIsoLogicalDate(point.date), { ...point });
  }

  for (const movement of movements) {
    const date = movementDate(movement);
    const key = formatIsoLogicalDate(date);
    const point = byDate.get(key) ?? {
      date,
      income: 0,
      expense: 0,
      delta: 0,
      balance: 0,
    };

    if (movement.type === 'INCOME') {
      point.income += movement.amount;
    } else {
      point.expense += movement.amount;
    }

    byDate.set(key, point);
  }

  let balance = account.realizedBalance;
  let lowestProjectedBalance = balance;
  let lowestProjectedBalanceDate = asOf;
  let pendingIncome = 0;
  let pendingExpense = 0;

  const timeline = [...byDate.values()]
    .sort((left, right) => compareLogicalDates(left.date, right.date))
    .map((point): ForecastTimelinePoint => {
      pendingIncome += point.income;
      pendingExpense += point.expense;
      const delta = point.income - point.expense + (point.transferDelta ?? 0);
      balance += delta;

      if (balance < lowestProjectedBalance) {
        lowestProjectedBalance = balance;
        lowestProjectedBalanceDate = point.date;
      }

      return {
        date: point.date,
        income: point.income,
        expense: point.expense,
        ...(point.transferDelta ? { transferDelta: point.transferDelta } : {}),
        delta,
        balance,
      };
    });

  return {
    ...account,
    pendingIncome,
    pendingExpense,
    projectedBalance: balance,
    lowestProjectedBalance,
    lowestProjectedBalanceDate,
    timeline,
  };
}

export function applyForecastScenarios(
  data: ForecastData,
  movements: readonly ForecastScenarioMovement[],
): ForecastScenarioResult {
  for (const movement of movements) {
    validateMovement(data, movement);
  }

  const appliedMovements = movements.filter(
    (movement) => compareLogicalDates(movementDate(movement), data.horizonEnd) <= 0,
  );
  const outsideHorizon = movements.filter(
    (movement) => compareLogicalDates(movementDate(movement), data.horizonEnd) > 0,
  );

  return {
    accounts: data.accounts.map((account) =>
      rebuildAccount(
        account,
        appliedMovements.filter((movement) => movement.accountId === account.id),
        data.asOf,
      ),
    ),
    appliedMovements: [...appliedMovements],
    outsideHorizon: [...outsideHorizon],
  };
}
