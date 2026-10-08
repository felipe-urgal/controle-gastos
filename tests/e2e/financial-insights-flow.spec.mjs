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

const insightsPayload = {
  success: true,
  data: {
    period: { year: 2026, month: 9 },
    currency: 'BRL',
    limit: 5,
    items: [
      {
        id: 'category-budget:market',
        type: 'CATEGORY_BUDGET',
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        message: 'Mercado atingiu 85% do orçamento do período.',
        href: '/categorias',
        data: {
          categoryId: 'market',
          categoryName: 'Mercado',
          state: 'NEAR',
          budget: 100000,
          consumption: 85000,
          percentage: 85,
        },
      },
      {
        id: 'upcoming-pending:7d',
        type: 'UPCOMING_PENDING',
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        message: '1 despesa(s) pendente(s) vence(m) nos próximos 7 dias.',
        href: '/calendario',
        data: {
          count: 1,
          amount: 25000,
          from: { year: 2026, month: 9, day: 28 },
          through: { year: 2026, month: 10, day: 4 },
        },
      },
    ],
  },
};

test('insights do dashboard: desktop, contexto, mobile e valores ocultos', async ({
  page,
}) => {
  test.setTimeout(75_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-financial-insights-${suffix}@example.test`;

  await createVerifiedUser({
      name: 'QA Financial Insights',
      email,
      password,
    });

  await login(page, email);

  await page.route('**/api/insights?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(insightsPayload),
    });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');

  const desktopCard = page
    .locator('section:visible')
    .filter({ hasText: 'Insights do período' })
    .first();

  await expect(desktopCard).toBeVisible();
  await expect(
    desktopCard.getByText(
      'Mercado atingiu 85% do orçamento do período.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    desktopCard.getByText('R$ 850,00 de R$ 1.000,00', { exact: true }),
  ).toBeVisible();

  await desktopCard
    .getByText('Mercado atingiu 85% do orçamento do período.', {
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/categorias$/);

  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/dashboard');

  const mobileCard = page
    .locator('section:visible')
    .filter({ hasText: 'Insights do período' })
    .first();

  await expect(mobileCard).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const hideValues = await page.evaluate(async () => {
    const response = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showValues: false }),
    });
    return response.ok;
  });
  expect(hideValues).toBe(true);

  await page.goto('/dashboard');

  const hiddenCard = page
    .locator('section:visible')
    .filter({ hasText: 'Insights do período' })
    .first();

  await expect(hiddenCard).toBeVisible();
  await expect(hiddenCard.getByText('•••• de ••••', { exact: true })).toBeVisible();
  await expect(hiddenCard).not.toContainText('R$ 850,00');
  await expect(hiddenCard).not.toContainText('R$ 1.000,00');
});
