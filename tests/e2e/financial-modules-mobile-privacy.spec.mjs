import { expect, test } from '@playwright/test';

import {
  api,
  createAccount,
  createCategory,
  expectMasked,
  expectNoHorizontalOverflow,
  expectNoMoneyLeak,
  forEachWidth,
  startScenario,
} from './support/matrix.mjs';

function monthAt(offset, day = 10) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, day);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function daysAhead(days) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Dataset único: recorrência candidata, compromissos a pagar/receber e parcela de dívida. */
async function seedFinancialModules(page, suffix) {
  const account = await createAccount(page, `Conta matriz ${suffix}`);
  const expense = await createCategory(page, `Despesa matriz ${suffix}`, 'EXPENSE');
  const income = await createCategory(page, `Receita matriz ${suffix}`, 'INCOME');
  const recurring = `Streaming matriz ${suffix}`;
  const payable = `Conta futura matriz ${suffix}`;
  const receivable = `Receita futura matriz ${suffix}`;

  for (const [index, amount] of [10000, 10100, 9900].entries()) {
    await api(page, 'POST', '/api/transactions', {
      accountId: account.id,
      categoryId: expense.id,
      amount,
      description: recurring,
      ...monthAt(index - 3),
      status: 'COMPLETED',
      type: 'EXPENSE',
    });
  }
  await api(page, 'POST', '/api/transactions', {
    accountId: account.id,
    categoryId: expense.id,
    amount: 123456,
    description: payable,
    ...daysAhead(2),
    status: 'PENDING',
    type: 'EXPENSE',
  });
  await api(page, 'POST', '/api/transactions', {
    accountId: account.id,
    categoryId: income.id,
    amount: 765432,
    description: receivable,
    ...daysAhead(2),
    status: 'PENDING',
    type: 'INCOME',
  });
  await api(page, 'POST', '/api/debts', {
    name: `Parcela matriz ${suffix}`.slice(0, 100),
    currency: 'BRL',
    balance: 543210,
    installmentAmount: 98765,
    dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
    remainingInstallments: 6,
    institution: null,
    description: null,
  });
  return { account, recurring, payable, receivable };
}

const HEADINGS = {
  '/compromissos': 'Compromissos financeiros',
  '/recorrencias': 'Recorrências e assinaturas',
  '/calendario': 'Calendário',
};

test('compromissos, recorrências e calendário: sem overflow em 320/360/390/1280', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const { suffix } = await startScenario(page, testInfo, 'mx-widths');
  const fixture = await seedFinancialModules(page, suffix);

  for (const [route, heading] of Object.entries(HEADINGS)) {
    await forEachWidth(page, async () => {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    });
  }

  await page.goto('/compromissos');
  await expect(page.getByText(fixture.payable, { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.receivable, { exact: true })).toBeVisible();
});

test('calendário: filtro por conta e drawer mantêm foco e sem overflow nas larguras', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const { suffix } = await startScenario(page, testInfo, 'mx-calendar');
  const fixture = await seedFinancialModules(page, suffix);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/calendario');
    const filter = page.getByLabel('Filtrar por conta', { exact: true });
    await expect(filter).toBeVisible();
    await filter.selectOption(fixture.account.id);
    await expect(filter).toHaveValue(fixture.account.id);
    await expect(page.getByRole('region', { name: 'Resumo do calendário' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const agenda = page
      .getByRole('complementary')
      .filter({ has: page.getByRole('heading', { name: 'Compromissos do período', exact: true }) });
    const item = agenda.getByRole('button').filter({ hasText: fixture.payable }).first();
    await item.click();
    const dialog = page.getByRole('dialog', { name: fixture.payable });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
});

test('compromissos, recorrências e calendário: showValues=false não vaza valores', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const { suffix } = await startScenario(page, testInfo, 'mx-privacy', { showValues: false });
  const fixture = await seedFinancialModules(page, suffix);

  for (const [route, heading] of Object.entries(HEADINGS)) {
    await forEachWidth(page, async () => {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expectMasked(page);
      await expectNoMoneyLeak(page);
    });
  }

  // Drawer do calendário e modais/cards das recorrências também mascarados.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendario');
  const agenda = page
    .getByRole('complementary')
    .filter({ has: page.getByRole('heading', { name: 'Compromissos do período', exact: true }) });
  await agenda.getByRole('button').filter({ hasText: fixture.payable }).first().click();
  await expect(page.getByRole('dialog', { name: fixture.payable })).toBeVisible();
  await expectNoMoneyLeak(page);
  await page.keyboard.press('Escape');

  await page.goto('/recorrencias');
  const candidate = page
    .locator('section[aria-labelledby="candidate-recurrences-title"]')
    .locator('article')
    .filter({ hasText: fixture.recurring })
    .first();
  await expect(candidate).toBeVisible();
  await expectNoMoneyLeak(page);
});

test('detector de vazamento: com showValues=true os valores são de fato detectados', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const { suffix } = await startScenario(page, testInfo, 'mx-detector');
  await seedFinancialModules(page, suffix);
  await page.goto('/compromissos');
  await expect(page.getByRole('heading', { name: 'Compromissos financeiros', exact: true })).toBeVisible();
  await expect(page.getByText(`Conta futura matriz ${suffix}`, { exact: true })).toBeVisible();
  await expect(expectNoMoneyLeak(page)).rejects.toThrow();
});
