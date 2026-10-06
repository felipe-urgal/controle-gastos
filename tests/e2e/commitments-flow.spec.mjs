import { expect, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function create(request, url, data) {
  const response = await request.post(url, { data });
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return body.data;
}

test('compromissos: rota exige sessão autenticada', async ({ page }) => {
  await page.goto('/compromissos');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('compromissos: separa a pagar e a receber e funciona em viewport estreito', async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-commitments-${suffix}@example.test`;

  await createVerifiedUser({ name: 'QA Compromissos', email, password });

  const login = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();

  const account = await create(request, '/api/accounts', {
    name: `Conta Compromissos ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    isActive: true,
  });
  const expense = await create(request, '/api/categories', {
    name: `Despesa Compromissos ${suffix}`,
    type: 'EXPENSE',
    color: '#EF4444',
    icon: 'tag',
    isActive: true,
    position: 0,
  });
  const income = await create(request, '/api/categories', {
    name: `Receita Compromissos ${suffix}`,
    type: 'INCOME',
    color: '#16A34A',
    icon: 'coins',
    isActive: true,
    position: 1,
  });

  const now = new Date();
  const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  await create(request, '/api/transactions', {
    accountId: account.id,
    categoryId: expense.id,
    amount: 3200,
    description: `Conta futura ${suffix}`,
    year: future.getFullYear(),
    month: future.getMonth() + 1,
    day: future.getDate(),
    status: 'PENDING',
    type: 'EXPENSE',
  });
  await create(request, '/api/transactions', {
    accountId: account.id,
    categoryId: income.id,
    amount: 8500,
    description: `Receita futura ${suffix}`,
    year: future.getFullYear(),
    month: future.getMonth() + 1,
    day: future.getDate(),
    status: 'PENDING',
    type: 'INCOME',
  });

  const state = await request.storageState();
  await page.context().addCookies(state.cookies);
  await page.goto('/compromissos');

  await expect(page.getByRole('heading', { name: 'Compromissos financeiros', exact: true })).toBeVisible();
  await expect(page.getByText('A pagar', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('A receber', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`Conta futura ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Receita futura ${suffix}`, { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 760 });
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
});
