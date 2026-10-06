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

function parseMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

function monthCount(from, to) {
  return (
    (to.year * 12 + to.month - 1) -
    (from.year * 12 + from.month - 1) +
    1
  );
}

function payload(url) {
  const currency = url.searchParams.get('currency') ?? 'BRL';
  const a = {
    from: parseMonth(url.searchParams.get('aFrom')),
    to: parseMonth(url.searchParams.get('aTo')),
  };
  const b = {
    from: parseMonth(url.searchParams.get('bFrom')),
    to: parseMonth(url.searchParams.get('bTo')),
  };
  const aMonths = monthCount(a.from, a.to);
  const bMonths = monthCount(b.from, b.to);

  const amounts = {
    BRL: { a: 98_700, b: 123_400 },
    USD: { a: 198_700, b: 234_500 },
    EUR: { a: 298_700, b: 345_600 },
  }[currency];

  const aIncome = amounts.a;
  const bIncome = amounts.b;
  const aExpense = Math.round(aIncome / 2);
  const bExpense = Math.round(bIncome / 2);

  return {
    currency,
    asOf: { year: 2026, month: 10, day: 6 },
    coverage: {
      sameLength: aMonths === bMonths,
      overlaps: false,
    },
    netWorthMethodology: {
      basis: 'TRANSACTION_BALANCE',
      description: 'Série transacional de teste.',
    },
    a: {
      range: a,
      months: aMonths,
      income: aIncome,
      expense: aExpense,
      balance: aIncome - aExpense,
      averageMonthlyIncome: Math.round(aIncome / aMonths),
      averageMonthlyExpense: Math.round(aExpense / aMonths),
      averageMonthlyBalance: Math.round(
        (aIncome - aExpense) / aMonths,
      ),
      netWorthEnd: 1_000_000,
      netWorthStatus: 'AVAILABLE',
      netWorthAsOf: {
        year: a.to.year,
        month: a.to.month,
        day: 31,
      },
      categories: [
        {
          id: 'food',
          name: 'Mercado',
          color: '#64748B',
          icon: 'shopping-cart',
          amount: aExpense,
          averageMonthlyAmount: Math.round(aExpense / aMonths),
        },
      ],
    },
    b: {
      range: b,
      months: bMonths,
      income: bIncome,
      expense: bExpense,
      balance: bIncome - bExpense,
      averageMonthlyIncome: Math.round(bIncome / bMonths),
      averageMonthlyExpense: Math.round(bExpense / bMonths),
      averageMonthlyBalance: Math.round(
        (bIncome - bExpense) / bMonths,
      ),
      netWorthEnd: 1_200_000,
      netWorthStatus: 'AVAILABLE',
      netWorthAsOf: {
        year: b.to.year,
        month: b.to.month,
        day: 31,
      },
      categories: [
        {
          id: 'food',
          name: 'Mercado',
          color: '#64748B',
          icon: 'shopping-cart',
          amount: bExpense,
          averageMonthlyAmount: Math.round(bExpense / bMonths),
        },
      ],
    },
    difference: {
      income: metric(bIncome, aIncome),
      expense: metric(bExpense, aExpense),
      balance: metric(bIncome - bExpense, aIncome - aExpense),
      averageMonthlyIncome: metric(
        Math.round(bIncome / bMonths),
        Math.round(aIncome / aMonths),
      ),
      averageMonthlyExpense: metric(
        Math.round(bExpense / bMonths),
        Math.round(aExpense / aMonths),
      ),
      averageMonthlyBalance: metric(
        Math.round((bIncome - bExpense) / bMonths),
        Math.round((aIncome - aExpense) / aMonths),
      ),
      netWorthEnd: metric(1_200_000, 1_000_000),
    },
    categories: [
      {
        id: 'food',
        name: 'Mercado',
        color: '#64748B',
        icon: 'shopping-cart',
        a: {
          amount: aExpense,
          averageMonthlyAmount: Math.round(aExpense / aMonths),
        },
        b: {
          amount: bExpense,
          averageMonthlyAmount: Math.round(bExpense / bMonths),
        },
        difference: metric(bExpense, aExpense),
        averageDifference: metric(
          Math.round(bExpense / bMonths),
          Math.round(aExpense / aMonths),
        ),
      },
    ],
  };
}

function metric(current, baseline) {
  const difference = current - baseline;
  return {
    difference,
    percentage:
      baseline === 0
        ? null
        : Math.round((difference / Math.abs(baseline)) * 1000) / 10,
  };
}

function mobileIncomeAmount(page, pattern) {
  return page
    .locator('article')
    .filter({ hasText: 'Receitas' })
    .getByText(pattern)
    .first();
}

async function installComparisonRoute(page) {
  await page.route('**/api/financial-comparison?**', async (route) => {
    const url = new URL(route.request().url());
    const currency = url.searchParams.get('currency') ?? 'BRL';

    if (currency === 'USD') {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: payload(url),
      }),
    });
  });
}

const query =
  'aFrom=2024-01&aTo=2024-03&bFrom=2025-01&bTo=2025-12&currency=BRL';

test('comparar: acesso direto sem sessão redireciona para login', async ({
  page,
}) => {
  await page.goto('/comparar');
  await expect(page).toHaveURL(/\/login$/);
});

test('comparar: desktop mantém comparação legível sem overflow', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = String(Date.now()) + '-' + test.info().project.name;
  const email = 'qa-comparison-desktop-' + suffix + '@example.test';
  await createVerifiedUser({
    name: 'QA Comparar Desktop',
    email,
    password,
  });
  await login(page, email);
  await installComparisonRoute(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/comparar?' + query);

  await expect(page.getByText('Métrica', { exact: true })).toBeVisible();
  await expect(page.getByText('Diferença B − A', { exact: true })).toBeVisible();
  await expect(page.getByText('Coberturas diferentes.')).toBeVisible();
  await expect(page.getByText(/1\.234,00/).first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('comparar: mobile, stale request e histórico da URL permanecem coerentes', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = String(Date.now()) + '-' + test.info().project.name;
  const email = 'qa-comparison-' + suffix + '@example.test';
  await createVerifiedUser({
    name: 'QA Comparar',
    email,
    password,
  });
  await login(page, email);
  await installComparisonRoute(page);

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/comparar?' + query);

  await expect(
    page.getByRole('heading', { name: 'Comparar períodos', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Coberturas diferentes.')).toBeVisible();
  await expect(mobileIncomeAmount(page, /1\.234,00/)).toBeVisible();

  await page.getByLabel('Moeda', { exact: true }).selectOption('USD');
  await expect(page).toHaveURL(/currency=USD/);
  await expect(
    page.getByRole('status').filter({ hasText: 'Comparando períodos' }),
  ).toBeVisible();
  await expect(page.getByText(/1\.234,00/)).toHaveCount(0);

  await page.getByLabel('Moeda', { exact: true }).selectOption('EUR');
  await expect(page).toHaveURL(/currency=EUR/);
  await expect(mobileIncomeAmount(page, /3\.456,00/)).toBeVisible();

  await page.waitForTimeout(850);
  await expect(page.getByText(/2\.345,00/)).toHaveCount(0);
  await expect(mobileIncomeAmount(page, /3\.456,00/)).toBeVisible();

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 740 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }

  await page.goBack();
  await expect(page).toHaveURL(/currency=USD/);
  await expect(mobileIncomeAmount(page, /2\.345,00/)).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/currency=EUR/);
  await expect(mobileIncomeAmount(page, /3\.456,00/)).toBeVisible();
});

test('comparar: valores ocultos não vazam pelos cards ou diferenças', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = String(Date.now()) + '-' + test.info().project.name;
  const email = 'qa-comparison-hidden-' + suffix + '@example.test';
  await createVerifiedUser({
    name: 'QA Comparar Oculto',
    email,
    password,
    showValues: false,
  });
  await login(page, email);
  await installComparisonRoute(page);

  await page.goto('/comparar?' + query);

  await expect(page.getByText('••••').first()).toBeVisible();
  await expect(page.getByText(/1\.234,00/)).toHaveCount(0);
  await expect(page.getByText(/987,00/)).toHaveCount(0);
  await expect(page.getByText(/2\.000,00/)).toHaveCount(0);
});
