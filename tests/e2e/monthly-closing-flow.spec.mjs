import { expect, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function shiftMonth(period, offset) {
  const absolute = period.year * 12 + (period.month - 1) + offset;
  return {
    year: Math.floor(absolute / 12),
    month: ((absolute % 12) + 12) % 12 + 1,
  };
}

function monthValue(period) {
  return String(period.year) + '-' + String(period.month).padStart(2, '0');
}

function payload({ period, currency, income, asOf, status }) {
  return {
    period,
    currency,
    asOf,
    status,
    retrospective: {
      summary: { income, expense: 0, balance: income },
      comparison: {
        previousPeriod: shiftMonth(period, -1),
        income: { difference: income, percentage: null },
        expense: { difference: 0, percentage: null },
        balance: { difference: income, percentage: null },
      },
      planning: {
        budget: 0,
        realized: 0,
        committed: 0,
        available: 0,
        overBudgetCategories: 0,
        realizedIncome: income,
        expectedIncome: 0,
        totalIncome: income,
      },
      topCategories: [],
      netWorth: null,
      netWorthMethodology: {
        basis: 'TRANSACTION_BALANCE',
        currentPointAsOf: asOf,
        description: 'Série contábil de teste.',
      },
      readiness: {
        checked: true,
        status: 'READY',
        pendingTransactions: {
          checked: true,
          totalCount: 0,
          income: { count: 0, amount: 0 },
          expense: { count: 0, amount: 0 },
        },
        reconciliation: {
          checked: true,
          accountCount: 0,
          reconciledCount: 0,
          issueCount: 0,
          accounts: [],
        },
        cardStatements: {
          checked: true,
          count: 0,
          paidCount: 0,
          openCount: 0,
          overdueCount: 0,
          items: [],
        },
      },
    },
  };
}

test('fechamento: acesso direto sem sessão redireciona para login', async ({
  page,
}) => {
  await page.goto('/fechamento');
  await expect(page).toHaveURL(/\/login$/);
});

test('fechamento: troca de filtros nunca exibe dados antigos sob a nova seleção', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = String(Date.now()) + '-' + test.info().project.name;
  const email = 'qa-monthly-closing-' + suffix + '@example.test';
  await createVerifiedUser({ name: 'QA Fechamento', email, password });
  await login(page, email);

  const instant = new Date();
  const current = {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
  };
  const previous = shiftMonth(current, -1);
  const asOf = {
    year: current.year,
    month: current.month,
    day: instant.getUTCDate(),
  };

  await page.route('**/api/monthly-closing?**', async (route) => {
    const url = new URL(route.request().url());
    const period = {
      year: Number(url.searchParams.get('year')),
      month: Number(url.searchParams.get('month')),
    };
    const currency = url.searchParams.get('currency') ?? 'BRL';

    if (
      period.year === previous.year &&
      period.month === previous.month &&
      currency === 'BRL'
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: payload({
            period,
            currency,
            income: 20_000,
            asOf,
            status: 'REVIEWABLE',
          }),
        }),
      });
      return;
    }

    const income = currency === 'EUR' ? 30_000 : 10_000;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: payload({
          period,
          currency,
          income,
          asOf,
          status:
            period.year === current.year && period.month === current.month
              ? 'IN_PROGRESS'
              : 'REVIEWABLE',
        }),
      }),
    });
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/fechamento');

  await expect(
    page.getByRole('heading', { name: 'Fechamento mensal', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/R\$\s*100,00/).first()).toBeVisible();

  await page.locator('input[type="month"]').fill(monthValue(previous));

  await expect(
    page.getByRole('status').filter({ hasText: 'Carregando revisão do período' }),
  ).toBeVisible();
  await expect(page.getByText(/R\$\s*100,00/)).toHaveCount(0);

  await page.getByLabel('Moeda', { exact: true }).selectOption('EUR');

  await expect(page.getByText(/300,00/).first()).toBeVisible();
  await expect(
    page.getByText('Pronto para revisão', { exact: true }),
  ).toBeVisible();

  await page.waitForTimeout(850);
  await expect(page.getByText(/R\$\s*200,00/)).toHaveCount(0);
  await expect(page.getByText(/300,00/).first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
