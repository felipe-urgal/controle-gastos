import { mkdir } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function evidence(page, name) {
  await mkdir('qa-evidence', { recursive: true });
  await page.screenshot({
    path: `qa-evidence/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });
}

async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

async function createFixture(page, fixture) {
  return page.evaluate(async (input) => {
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
      name: input.accountName,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#7C3AED',
      icon: 'wallet',
      description: null,
      isActive: true,
    });
    const incomeCategory = await create('/api/categories', {
      name: input.incomeCategory,
      type: 'INCOME',
      color: '#22C55E',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });
    const expenseCategory = await create('/api/categories', {
      name: input.expenseCategory,
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });

    const common = {
      accountId: account.id,
      year: input.year,
      month: input.month,
      day: input.day,
      status: 'COMPLETED',
    };
    const income = await create('/api/transactions', {
      ...common,
      categoryId: incomeCategory.id,
      amount: 10000,
      description: input.incomeDescription,
      type: 'INCOME',
    });
    const expense = await create('/api/transactions', {
      ...common,
      categoryId: expenseCategory.id,
      amount: 2500,
      description: input.expenseDescription,
      type: 'EXPENSE',
    });
    await create('/api/transactions', {
      ...common,
      categoryId: expenseCategory.id,
      amount: 9999,
      description: input.pendingDescription,
      type: 'EXPENSE',
      status: 'PENDING',
    });

    return { account, income, expense };
  }, fixture);
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('QA #286 reconcilia e desfaz sem alterar saldo realizado', async ({ page, request }) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa286-${suffix}@example.test`;
  const accountName = `Conta reconciliação ${suffix}`;
  const incomeDescription = `Crédito reconciliação ${suffix}`;
  const expenseDescription = `Débito reconciliação ${suffix}`;
  const pendingDescription = `Pendente ignorada ${suffix}`;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const logicalDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  expect(
    (await request.post('/api/auth/signup', {
      data: { name: 'QA 286', email, password },
    })).ok(),
  ).toBeTruthy();
  await login(page, email);

  const fixture = await createFixture(page, {
    accountName,
    incomeCategory: `Receita ${suffix}`.slice(0, 50),
    expenseCategory: `Despesa ${suffix}`.slice(0, 50),
    incomeDescription,
    expenseDescription,
    pendingDescription,
    year,
    month,
    day,
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/contas/show/${fixture.account.id}`);
  await expect(page.getByRole('heading', { name: accountName, exact: true })).toBeVisible();
  await expect(page.getByText('R$ 75,00', { exact: true }).first()).toBeVisible();

  const trigger = page.getByRole('button', { name: 'Iniciar reconciliação', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const cutoff = page.getByLabel('Data final do extrato', { exact: true });
  await expect(cutoff).toBeFocused();
  await cutoff.fill(logicalDate);
  const statementBalance = page.getByLabel(/Saldo final do extrato/);
  await expect(statementBalance).toHaveValue(/75,00/);
  await page.getByRole('button', { name: 'Calcular diferença', exact: true }).click();

  await expect(page.getByText('Ainda há diferença', { exact: true })).toBeVisible();
  const confirm = page.getByRole('button', { name: 'Confirmar reconciliação', exact: true });
  await expect(confirm).toBeDisabled();

  const incomeItem = page.getByRole('listitem').filter({ hasText: incomeDescription });
  await incomeItem.getByRole('button', { name: 'Marcar conferida', exact: true }).click();
  const expenseItem = page.getByRole('listitem').filter({ hasText: expenseDescription });
  await expenseItem.getByRole('button', { name: 'Marcar conferida', exact: true }).click();

  await expect(page.getByText('Extrato conferido', { exact: true })).toBeVisible();
  await expect(confirm).toBeEnabled();
  await expect(page.getByText('R$ 75,00', { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await evidence(page, 'desktop-ready-to-close');

  await confirm.click();
  await expect(page.getByText(/2 lançamentos reconciliados com sucesso\./)).toBeVisible();
  await expect(page.getByText('Último fechamento ativo', { exact: true })).toBeVisible();
  await expect(page.getByText('Reconciliada', { exact: true })).toHaveCount(2);
  await expect(page.getByText('R$ 75,00', { exact: true }).first()).toBeVisible();
  await evidence(page, 'desktop-reconciled');

  await page.getByRole('button', { name: 'Desfazer último fechamento', exact: true }).click();
  await expect(page.getByText(/retorna somente este lote para/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar desfazer', exact: true }).click();
  await expect(page.getByText('2 lançamentos voltaram para Conferida.', { exact: true })).toBeVisible();
  await expect(page.getByText('Conferida', { exact: true })).toHaveCount(2);
  await expect(page.getByText('R$ 75,00', { exact: true }).first()).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  await expectNoHorizontalOverflow(page);
  await evidence(page, 'mobile-after-undo');

  expect(
    await page.evaluate(async () =>
      (
        await fetch('/api/user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showValues: false }),
        })
      ).ok,
    ),
  ).toBeTruthy();

  await page.reload();
  await expect(page.getByText('••••', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('R$ 75,00', { exact: true })).toHaveCount(0);

  const hiddenTrigger = page.getByRole('button', { name: 'Iniciar reconciliação', exact: true });
  await hiddenTrigger.focus();
  await page.keyboard.press('Enter');
  const hiddenCutoff = page.getByLabel('Data final do extrato', { exact: true });
  await expect(hiddenCutoff).toBeFocused();
  await hiddenCutoff.fill(logicalDate);
  const hiddenStatement = page.getByLabel(/Saldo final do extrato/);
  await expect(hiddenStatement).toHaveValue('');
  await hiddenStatement.fill('75,00');
  await page.getByRole('button', { name: 'Calcular diferença', exact: true }).click();
  await expect(page.getByText('Extrato conferido', { exact: true })).toBeVisible();
  await expect(page.getByText('••••', { exact: true })).toHaveCount(6);
  await expect(page.getByText('R$ 75,00', { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await evidence(page, 'mobile-hidden-values');

  await page.getByRole('button', { name: 'Fechar painel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar reconciliação', exact: true })).toBeFocused();
});
