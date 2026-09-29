import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedNetWorth(page, accountName, categoryName) {
  return page.evaluate(async ({ accountName: account, categoryName: category }) => {
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

    const now = new Date();
    const createdAccount = await create('/api/accounts', {
      name: account,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#2563EB',
      icon: 'wallet',
      description: 'Conta isolada do E2E de patrimônio',
      isActive: true,
    });

    const createdCategory = await create('/api/categories', {
      name: category,
      type: 'INCOME',
      color: '#16A34A',
      icon: 'tag',
      description: 'Categoria isolada do E2E de patrimônio',
      isActive: true,
      position: 0,
    });

    const usdAccount = await create('/api/accounts', {
      name: `${account} USD`,
      type: 'INVESTMENT',
      currency: 'USD',
      color: '#0F766E',
      icon: 'chart-line',
      description: 'Conta USD isolada do E2E de patrimônio',
      isActive: true,
    });

    const usdCategory = await create('/api/categories', {
      name: `${category} USD`,
      type: 'INCOME',
      color: '#0F766E',
      icon: 'tag',
      description: 'Categoria USD isolada do E2E de patrimônio',
      isActive: true,
      position: 1,
    });

    await create('/api/transactions', {
      accountId: createdAccount.id,
      categoryId: createdCategory.id,
      amount: 123450,
      description: 'Saldo realizado E2E patrimônio',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: Math.max(1, Math.min(now.getDate(), 28)),
      status: 'COMPLETED',
      type: 'INCOME',
    });

    await create('/api/transactions', {
      accountId: usdAccount.id,
      categoryId: usdCategory.id,
      amount: 10000,
      description: 'Saldo USD E2E patrimônio',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: Math.max(1, Math.min(now.getDate(), 28)),
      status: 'COMPLETED',
      type: 'INCOME',
    });

    return { accountId: createdAccount.id, usdAccountId: usdAccount.id };
  }, { accountName, categoryName });
}

async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

test('patrimônio: resumo no dashboard e evolução responsiva', async ({ page, request }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-net-worth-${suffix}@example.test`;
  const accountName = `Conta Patrimônio E2E ${suffix}`;
  const categoryName = `Receita Patrimônio E2E ${suffix}`;

  const signup = await request.post('/api/auth/signup', {
    data: {
      name: 'QA Patrimônio',
      email,
      password,
    },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, email);
  await seedNetWorth(page, accountName, categoryName);

  await page.goto('/dashboard');
  const summary = page.getByRole('link', { name: 'Ver patrimônio', exact: true }).first();
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Patrimônio · BRL');
  await expect(summary).toContainText('R$');
  await expect(summary).toContainText('1 conta elegível');

  await summary.click();
  await expect(page).toHaveURL(/\/patrimonio$/);
  await expect(page.getByRole('heading', { name: 'Patrimônio', exact: true })).toBeVisible();
  await expect(page.getByText('Patrimônio em BRL', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evolução mensal', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Distribuição por conta', exact: true })).toBeVisible();
  await expect(page.getByText(accountName, { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Evolução mensal do patrimônio em BRL' })).toBeVisible();

  await page.getByLabel('Consolidar patrimônio em').selectOption('BRL');
  await expect(page.getByText('Consolidação incompleta', { exact: true })).toBeVisible();
  await expect(page.getByText('USD → BRL', { exact: true }).first()).toBeVisible();

  await page.getByLabel('Moeda de origem da taxa').selectOption('USD');
  await page.getByLabel('Moeda de destino da taxa').selectOption('BRL');
  await page.getByLabel('Valor da taxa manual').fill('5');
  const now = new Date();
  const rateDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  await page.getByLabel('Data de referência da taxa').fill(rateDate);
  await page.getByRole('button', { name: 'Salvar taxa', exact: true }).click();

  await expect(page.getByText('Patrimônio convertido', { exact: true })).toBeVisible();
  await expect(page.getByText('1 USD = 5 BRL', { exact: false }).first()).toBeVisible();

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 760 });
    await expect(page.getByRole('heading', { name: 'Patrimônio', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.getByLabel('Período do histórico').selectOption('6');
  await expect(page.getByRole('img', { name: 'Evolução mensal do patrimônio em BRL' })).toBeVisible();
});
