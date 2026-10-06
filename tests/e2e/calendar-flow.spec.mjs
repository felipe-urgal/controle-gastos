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

test('calendário: mostra o total completo de compromissos e mantém filtro no mobile', async ({ page }) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-calendar-${suffix}@example.test`;
  const accountName = `Conta calendário ${suffix}`.slice(0, 50);

  await createVerifiedUser({
    name: 'QA Calendário',
    email,
    password,
  });
  await login(page, email);

  const fixture = await page.evaluate(async ({ suffix: seedSuffix, accountName: seedAccountName }) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(body)}`);
      }
      return body.data;
    }

    const account = await create('/api/accounts', {
      name: seedAccountName,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#2563EB',
      icon: 'wallet',
      description: null,
      isActive: true,
    });

    const category = await create('/api/categories', {
      name: `Agenda E2E ${seedSuffix}`.slice(0, 50),
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });

    const now = new Date();
    const date = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };

    const descriptions = [];
    for (let index = 1; index <= 7; index += 1) {
      const description = `Compromisso ${String(index).padStart(2, '0')} ${seedSuffix}`;
      descriptions.push(description);
      await create('/api/transactions', {
        accountId: account.id,
        categoryId: category.id,
        amount: index * 1000,
        description,
        ...date,
        status: 'PENDING',
        type: 'EXPENSE',
      });
    }

    return { account, descriptions, date };
  }, { suffix, accountName });

  await page.goto('/calendario');
  await expect(
    page.getByRole('heading', { name: 'Calendário', exact: true }),
  ).toBeVisible();

  const summary = page.getByRole('region', { name: 'Resumo do calendário' });
  await expect(summary).toContainText('7 itens');

  const agenda = page
    .getByRole('complementary')
    .filter({ has: page.getByRole('heading', { name: 'Compromissos do período', exact: true }) });

  await expect(agenda).toContainText('7 itens');
  await expect(
    agenda.getByText(fixture.descriptions[6], { exact: true }),
  ).toHaveCount(0);

  await agenda.getByRole('button', { name: 'Ver todos (7)', exact: true }).click();
  await expect(
    agenda.getByText(fixture.descriptions[6], { exact: true }),
  ).toBeVisible();

  const otherDay = fixture.date.day === 1 ? 2 : 1;
  await page
    .getByRole('button', {
      name: new RegExp(`^${otherDay}(?: |\\.)`),
    })
    .first()
    .click();
  await expect(summary).toContainText('7 itens');

  await page.setViewportSize({ width: 320, height: 760 });
  const accountFilter = page.getByLabel('Filtrar por conta', { exact: true });
  await expect(accountFilter).toBeVisible();
  await accountFilter.selectOption(fixture.account.id);
  await expect(accountFilter).toHaveValue(fixture.account.id);
  await expect(summary).toContainText('7 itens');

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
});
