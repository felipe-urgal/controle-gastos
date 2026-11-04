import { getFinancialCommitmentsFromForecastForUser } from "@/app/lib/commitments/financial-commitments";
import { listCategoryMonthlyLimitsForUser } from "@/app/lib/category-limits/category-monthly-limits";
import { logicalDateFromInstant } from "@/app/lib/date/logical-date";
import { getForecastForUser } from "@/app/lib/forecast/forecast";
import { applyDailyCap, filterNewCandidates } from "@/app/lib/notifications/notification-cap";
import {
  DAILY_NOTIFICATION_CAP,
  type NotificationCandidate,
} from "@/app/lib/notifications/notification-model";
import {
  isTypeEnabled,
  type NotificationPreferenceRow,
} from "@/app/lib/notifications/notification-preferences";
import {
  budgetNotifications,
  commitmentNotifications,
  forecastNotifications,
} from "@/app/lib/notifications/notification-rules";
import { prisma } from "@/app/lib/prisma";
import { isSupportedCurrency, type SupportedCurrency } from "@/app/types/financial-summary";

/** O horizonte cobre "vence em 3 dias" com folga e deixa o ponto mais baixo da projeção visível. */
const FORECAST_DAYS = 30 as const;

export type NotificationGenerationResult = {
  candidates: number;
  created: number;
};

const EMPTY_RESULT: NotificationGenerationResult = { candidates: 0, created: 0 };

/** Início do dia de Brasília (UTC−3, sem horário de verão) como instante UTC. */
function startOfLogicalDay(date: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 3));
}

async function userCurrencies(userId: string): Promise<SupportedCurrency[]> {
  const rows = await prisma.account.findMany({
    where: { userId, isActive: true },
    distinct: ["currency"],
    select: { currency: true },
  });
  return rows.map((row) => row.currency).filter(isSupportedCurrency);
}

async function candidatesForCurrency(args: {
  userId: string;
  currency: SupportedCurrency;
  now: Date;
  showValues: boolean;
  preferences: readonly NotificationPreferenceRow[];
  checkingAccountIds: ReadonlySet<string>;
}): Promise<NotificationCandidate[]> {
  const { userId, currency, now, showValues, preferences, checkingAccountIds } = args;
  const asOf = logicalDateFromInstant(now);
  const candidates: NotificationCandidate[] = [];

  const needsForecast = (["CARD_STATEMENT_DUE", "COMMITMENT_DUE", "INCOME_OVERDUE", "FORECAST_NEGATIVE"] as const).some(
    (type) => isTypeEnabled(type, preferences),
  );

  if (needsForecast) {
    const forecast = await getForecastForUser(userId, { currency, days: FORECAST_DAYS }, now);
    const commitments = await getFinancialCommitmentsFromForecastForUser(
      userId,
      { currency, days: FORECAST_DAYS },
      forecast,
      now,
    );

    candidates.push(...commitmentNotifications({ commitments: commitments.items, asOf, showValues }));
    candidates.push(
      ...forecastNotifications({
        accounts: forecast.accounts
          .filter((account) => checkingAccountIds.has(account.id))
          .map((account) => ({
            id: account.id,
            name: account.name,
            currency,
            lowestProjectedBalance: account.lowestProjectedBalance,
            lowestProjectedBalanceDate: account.lowestProjectedBalanceDate,
          })),
        asOf,
        showValues,
      }),
    );
  }

  if (isTypeEnabled("BUDGET_LIMIT", preferences)) {
    const limits = await listCategoryMonthlyLimitsForUser(userId, asOf.year, asOf.month, currency);
    candidates.push(
      ...budgetNotifications({
        items: limits.items.flatMap((item) =>
          item.limit && item.category.isActive
            ? [
                {
                  categoryId: item.category.id,
                  categoryName: item.category.name,
                  currency,
                  limitAmount: item.limit.amount,
                  consumption: item.realized + item.committed,
                  planningPercentage: item.planningPercentage,
                },
              ]
            : [],
        ),
        asOf,
        showValues,
      }),
    );
  }

  return candidates;
}

/**
 * Calcula e grava os avisos novos de um usuário. Idempotente: a mesma condição nunca gera dois
 * avisos (chave única por usuário), e rodar de novo no mesmo dia só completa a cota diária.
 * Cada moeda tem o seu próprio cálculo; nada é somado entre moedas.
 */
export async function generateNotificationsForUser(
  userId: string,
  now: Date = new Date(),
): Promise<NotificationGenerationResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { showValues: true },
  });
  if (!user) return EMPTY_RESULT;

  const asOf = logicalDateFromInstant(now);
  const [preferences, currencies, checkingAccounts] = await Promise.all([
    prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, inApp: true, email: true, push: true },
    }),
    userCurrencies(userId),
    prisma.account.findMany({
      where: { userId, isActive: true, type: "CREDIT_DEBIT" },
      select: { id: true },
    }),
  ]);
  const checkingAccountIds = new Set(checkingAccounts.map((account) => account.id));

  const all: NotificationCandidate[] = [];
  for (const currency of currencies) {
    all.push(
      ...(await candidatesForCurrency({
        userId,
        currency,
        now,
        showValues: user.showValues,
        preferences,
        checkingAccountIds,
      })),
    );
  }

  const enabled = all.filter((candidate) => isTypeEnabled(candidate.type, preferences));
  if (enabled.length === 0) return EMPTY_RESULT;

  const [existing, sentToday] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, dedupeKey: { in: enabled.map((candidate) => candidate.dedupeKey) } },
      select: { dedupeKey: true },
    }),
    prisma.notification.count({
      where: { userId, type: { not: "SUMMARY" }, createdAt: { gte: startOfLogicalDay(asOf) } },
    }),
  ]);
  const existingKeys = new Set(existing.map((row) => row.dedupeKey));

  const fresh = filterNewCandidates(enabled, existingKeys);
  const remaining = DAILY_NOTIFICATION_CAP - sentToday;
  if (fresh.length === 0 || remaining <= 0) return { candidates: enabled.length, created: 0 };

  // O resumo do dia pode já existir (nova execução) ou estar desligado.
  const toStore = filterNewCandidates(applyDailyCap(fresh, asOf, remaining), existingKeys).filter(
    (candidate) => isTypeEnabled(candidate.type, preferences),
  );
  if (toStore.length === 0) return { candidates: enabled.length, created: 0 };

  const created = await prisma.notification.createMany({
    data: toStore.map((candidate) => ({
      userId,
      type: candidate.type,
      dedupeKey: candidate.dedupeKey,
      severity: candidate.severity,
      title: candidate.title,
      body: candidate.body,
      href: candidate.href,
      // O instante da execução, não o do banco: a cota diária conta por este campo.
      createdAt: now,
    })),
    skipDuplicates: true,
  });

  return { candidates: enabled.length, created: created.count };
}
