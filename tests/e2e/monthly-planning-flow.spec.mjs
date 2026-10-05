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

async function seedSupportingData(page, suffix) {
  return page.evaluate(async ({ suffix: seedSuffix }) => {
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
      name: `Conta planejamento ${seedSuffix}`,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#3B82F6',
      icon: 'wallet',
      description: null,
      isActive: true,
    });

    const category = await create('/api/categories', {
      name: `Planejamento ${seedSuffix}`.slice(0, 50),
      type: 'EXPENSE',
      color: '#8B5CF6',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });

    return {
      accountId: account.id,
      accountName: account.name,
      categoryId: category.id,
      categoryName: category.name,
    };
  }, { suffix });
}

test('planejamento: ajustar orçamento, criar despesa e atualizar consumo', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-planning-${suffix}@example.test`;
  const transactionDescription = `Despesa planejamento ${suffix}`;

  await createVerifiedUser({ name: 'QA Planejamento', email, password });
  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });

  const supporting = await seedSupportingData(page, suffix);

  await page.goto('/categorias');
  await page.getByLabel('Buscar categoria', { exact: true }).fill(supporting.categoryName);

  const categoryRow = page
    .getByRole('button')
    .filter({ hasText: supporting.categoryName })
    .first();
  await expect(categoryRow).toBeVisible();
  await categoryRow.click();

  await page.getByRole('button', { name: 'Definir limite', exact: true }).click();

  const limitDialog = page.getByRole('dialog', {
    name: new RegExp(`Definir limite.*${supporting.categoryName}`),
  });
  await expect(limitDialog).toBeVisible();
  await limitDialog.getByLabel('Valor do limite em BRL', { exact: true }).fill('500,00');
  await limitDialog.getByRole('button', { name: 'Salvar limite', exact: true }).click();
  await expect(limitDialog).toBeHidden();

  const period = await page.evaluate(() => {
    const now = new Date();
    return {
      date: [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-'),
    };
  });

  await page.goto('/transacoes/nova');
  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: supporting.accountName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: supporting.categoryName, exact: true }).click();
  await page.getByLabel(/^Valor\b/).fill('20000');
  await page.getByLabel(/^Descrição\b/).fill(transactionDescription);
  await page.locator('input[type="date"]').first().fill(period.date);
  await page.getByRole('button', { name: 'Revisar e criar', exact: true }).click();

  const review = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
  await expect(review).toBeVisible();
  await expect(review).toContainText('R$ 200,00');
  await review.getByRole('button', { name: 'Criar transação', exact: true }).click();
  await expect(page).toHaveURL(/\/transacoes$/);

  await page.goto('/categorias');
  await page.getByLabel('Buscar categoria', { exact: true }).fill(supporting.categoryName);
  const updatedRow = page
    .getByRole('button')
    .filter({ hasText: supporting.categoryName })
    .first();
  await expect(updatedRow).toBeVisible();
  await updatedRow.click();

  const context = page
    .getByRole('heading', { name: 'Resumo da categoria selecionada', exact: true })
    .locator('..');
  await expect(context).toContainText('R$ 500,00');
  await expect(context).toContainText('R$ 200,00');
  await expect(context).toContainText('R$ 300,00');
  await expect(context).toContainText('40%');

  const apiState = await page.evaluate(async (categoryId) => {
    const now = new Date();
    const params = new URLSearchParams({
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
      currency: 'BRL',
    });
    const response = await fetch(`/api/category-limits?${params.toString()}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`planning failed with ${response.status}: ${JSON.stringify(body)}`);
    }
    return body.data.items.find((item) => item.category.id === categoryId);
  }, supporting.categoryId);

  expect(apiState).toMatchObject({
    realized: 20000,
    committed: 0,
    consumption: 20000,
    available: 30000,
    planningPercentage: 40,
    isOverBudget: false,
  });
});
