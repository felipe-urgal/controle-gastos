import { getFinancialCommitmentsFromForecastForUser } from '@/app/lib/commitments/financial-commitments';
import {
  daysBetweenLogicalDates,
  lastDayOfMonth,
  logicalDateFromInstant,
} from '@/app/lib/date/logical-date';
import {
  dashboardPeriodRelation,
  dashboardReferenceDate,
} from '@/app/lib/dashboard/dashboard-period';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import {
  getForecastForUser,
  type ForecastForUserResult,
} from '@/app/lib/forecast/forecast';
import { getFinancialInsightsFromContext } from '@/app/lib/insights/financial-insights';
import { getNetWorthForUser } from '@/app/lib/net-worth/net-worth';
import { prisma } from '@/app/lib/prisma';
import type {
  DashboardHome,
  DashboardPeriod,
  DashboardRecentTransaction,
  DashboardSection,
} from '@/app/types/dashboard';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData } from '@/app/types/forecast';

export { dashboardPeriodRelation };

async function captureSection<T>(
  load: () => Promise<T>,
  message: string,
): Promise<DashboardSection<T>> {
  try {
    return {
      status: 'SUCCESS',
      data: await load(),
    };
  } catch {
    return {
      status: 'ERROR',
      message,
    };
  }
}


function toDashboardForecastData(
  forecast: ForecastForUserResult,
): ForecastData {
  const normalizeItem = (
    item: ForecastForUserResult['upcoming'][number],
  ): ForecastData['upcoming'][number] => ({
    ...item,
    kind: item.kind ?? 'NORMAL',
    status: 'PENDING',
  });

  return {
    ...forecast,
    overdue: forecast.overdue.map(normalizeItem),
    upcoming: forecast.upcoming.map(normalizeItem),
  };
}

async function getRecentDashboardTransactionsForUser(
  userId: string,
  period: DashboardPeriod,
  currency: SupportedCurrency,
): Promise<DashboardRecentTransaction[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      year: period.year,
      month: period.month,
      // Agendadas (PENDING) aparecem em Compromissos; canceladas não são movimentação.
      status: 'COMPLETED',
      account: {
        is: {
          userId,
          currency,
        },
      },
      OR: [
        { kind: { notIn: ['TRANSFER', 'OPENING_BALANCE'] } },
        { kind: 'TRANSFER', transferRole: 'SOURCE' },
      ],
    },
    select: {
      id: true,
      amount: true,
      type: true,
      kind: true,
      description: true,
      status: true,
      year: true,
      month: true,
      day: true,
      transferRole: true,
      account: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
      transfer: {
        select: {
          transactions: {
            select: {
              id: true,
              account: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { day: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: 5,
  });

  return rows.map((row) => {
    const counterpart =
      row.kind === 'TRANSFER'
        ? row.transfer?.transactions.find((item) => item.id !== row.id)?.account ??
          null
        : null;

    return {
      id: row.id,
      amount: row.amount,
      type: row.type,
      kind: row.kind,
      description: row.description,
      status: row.status,
      year: row.year,
      month: row.month,
      day: row.day,
      transferRole: row.transferRole,
      account: {
        ...row.account,
        currency,
      },
      counterpartAccount: counterpart
        ? {
            ...counterpart,
            currency,
          }
        : null,
      category: row.category,
    };
  });
}

export async function getDashboardHomeForUser(
  userId: string,
  period: DashboardPeriod,
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<DashboardHome> {
  const asOf = logicalDateFromInstant(now);
  const relation = dashboardPeriodRelation(period, { year: asOf.year, month: asOf.month });
  const referenceDate = dashboardReferenceDate(period, asOf);
  const periodEnd = lastDayOfMonth({ year: period.year, month: period.month, day: 1 });

  // Projeção até o fim do mês escolhido (30/60/90 dias a partir de hoje). Mês passado não tem
  // projeção; mês futuro além de 90 dias também não.
  const forecastDays: 30 | 60 | 90 | null = (() => {
    if (relation === 'PAST') return null;
    const needed = daysBetweenLogicalDates(asOf, periodEnd) + 1;
    if (needed <= 30) return 30;
    if (needed <= 60) return 60;
    if (needed <= 90) return 90;
    return null;
  })();
  const notApplicable: DashboardSection<never> = { status: 'NOT_APPLICABLE' };

  const [
    monthly,
    forecastSection,
    recentTransactions,
    netWorth,
  ] = await Promise.all([
    getMonthlyDashboardForUser(userId, period, currency, now),
    forecastDays === null
      ? Promise.resolve<DashboardSection<ForecastForUserResult>>(notApplicable)
      : captureSection(
          () =>
            getForecastForUser(userId, { currency, days: forecastDays }, now, {
              safeToSpendThrough: periodEnd.year === asOf.year && periodEnd.month === asOf.month
                ? lastDayOfMonth(asOf)
                : periodEnd,
            }),
          'Não foi possível carregar a projeção deste período.',
        ),
    captureSection(
      () => getRecentDashboardTransactionsForUser(userId, period, currency),
      'Não foi possível carregar as transações recentes.',
    ),
    captureSection(
      async () => {
        const data = await getNetWorthForUser(userId, {
          year: period.year,
          month: period.month,
          months: 1,
          referenceNow: now,
        });
        const selected =
          data.byCurrency.find((item) => item.currency === currency) ?? null;

        return {
          currency,
          total: selected?.total ?? null,
          accountCount: selected?.accounts.length ?? 0,
        };
      },
      'Não foi possível carregar o patrimônio deste período.',
    ),
  ]);

  let commitments: DashboardSection<FinancialCommitmentsData>;
  let insights: DashboardSection<FinancialInsightsData>;

  if (forecastSection.status === 'SUCCESS' && forecastDays !== null) {
    [commitments, insights] = await Promise.all([
      captureSection(
        () =>
          getFinancialCommitmentsFromForecastForUser(
            userId,
            { currency, days: forecastDays },
            forecastSection.data,
            now,
          ),
        'Não foi possível carregar os compromissos deste período.',
      ),
      captureSection(
        () =>
          getFinancialInsightsFromContext(
            userId,
            period,
            currency,
            monthly,
            forecastSection.data,
          ),
        'Não foi possível carregar os insights deste período.',
      ),
    ]);
  } else if (forecastSection.status === 'NOT_APPLICABLE') {
    commitments = notApplicable;
    insights = await captureSection(
      () => getFinancialInsightsFromContext(userId, period, currency, monthly, null),
      'Não foi possível carregar os insights deste período.',
    );
  } else {
    commitments = {
      status: 'ERROR',
      message:
        'Compromissos indisponíveis enquanto a projeção não carregar.',
    };
    insights = {
      status: 'ERROR',
      message:
        'Insights indisponíveis enquanto a projeção não carregar.',
    };
  }

  const cashAccounts = monthly.accounts
    .filter(
      (account) =>
        account.isActive &&
        account.type === 'CREDIT_DEBIT' &&
        account.currency === currency,
    )
    .map((account) => ({
      id: account.id,
      name: account.name,
      currency,
      color: account.color,
      icon: account.icon,
      balance: account.balance,
    }));

  return {
    monthly,
    scope: {
      selectedPeriod: period,
      selectedPeriodRelation: relation,
      currentAsOf: asOf,
      referenceDate,
    },
    current: {
      cash: {
        total: cashAccounts.reduce((sum, account) => sum + account.balance, 0),
        accounts: cashAccounts,
      },
      forecast:
        forecastSection.status === 'SUCCESS'
          ? {
              status: 'SUCCESS',
              data: toDashboardForecastData(forecastSection.data),
            }
          : forecastSection,
      commitments,
    },
    recentTransactions,
    netWorth,
    insights,
  };
}
