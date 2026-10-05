import { expect, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

function previousMonthPurchaseDate() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 4);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    '04',
  ].join('-');
}

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

    const payer = await create('/api/accounts', {
      name: `Conta pagadora ${seedSuffix}`,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#3B82F6',
      icon: 'wallet',
      description: null,
      isActive: true,
    });

    const category = await create('/api/categories', {
      name: `Compras cartão ${seedSuffix}`.slice(0, 50),
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });

    const card = await create('/api/accounts', {
      name: `Cartão E2E ${seedSuffix}`.slice(0, 50),
      type: 'CREDIT_CARD',
      currency: 'BRL',
      color: '#7C3AED',
      icon: 'credit-card',
      description: null,
      isActive: true,
      creditLimit: 500000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });

    return {
      payerId: payer.id,
      payerName: payer.name,
      categoryId: category.id,
      categoryName: category.name,
      card,
    };
  }, { suffix });
}

test('cartão: criar, comprar, visualizar fatura e pagar', async ({ page }) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-card-${suffix}@example.test`;
  const cardName = `Cartão E2E ${suffix}`;
  const purchaseDescription = `Compra cartão E2E ${suffix}`;

  await createVerifiedUser({ name: 'QA Cartão', email, password });

  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });

  const supporting = await seedSupportingData(page, suffix);
  const card = supporting.card;
  expect(card).toBeTruthy();
  expect(card.type).toBe('CREDIT_CARD');

  await page.goto('/transacoes/nova');
  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: cardName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: supporting.categoryName, exact: true }).click();
  await page.getByLabel(/^Valor\b/).fill('12345');
  await page.getByLabel(/^Descrição\b/).fill(purchaseDescription);
  await page.locator('input[type="date"]').first().fill(previousMonthPurchaseDate());
  await page.getByRole('button', { name: 'Revisar e criar', exact: true }).click();

  const review = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
  await expect(review).toBeVisible();
  await expect(review).toContainText(cardName);
  await expect(review).toContainText('R$ 123,45');
  await review.getByRole('button', { name: 'Criar transação', exact: true }).click();
  await expect(page).toHaveURL(/\/transacoes$/);

  await page.goto(`/contas/show/${card.id}`);
  await expect(page.getByRole('heading', { name: cardName, exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Limite total', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Histórico de faturas', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText('R$ 123,45', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();

  const payButton = page
    .getByRole('button', { name: 'Pagar fatura', exact: true })
    .filter({ visible: true })
    .first();
  await expect(payButton).toBeVisible();
  await payButton.click();

  const dialog = page.getByRole('dialog', { name: 'Pagar fatura', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Conta pagadora', { exact: true }).selectOption(supporting.payerId);
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByText('Paga', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();

  const statements = await page.evaluate(async (cardId) => {
    const response = await fetch(`/api/cards/${cardId}/statements?history=12`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`statements failed with ${response.status}: ${JSON.stringify(body)}`);
    }
    return body.data;
  }, card.id);

  expect(statements.history.some((statement) => statement.status === 'PAID' && statement.total === 12345)).toBeTruthy();
  expect(statements.card.usedLimit).toBe(0);
  expect(statements.card.availableLimit).toBe(500000);
});
