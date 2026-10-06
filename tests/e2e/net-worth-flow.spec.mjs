import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function signup(request, prefix) {
  const suffix = `${Date.now()}-${test.info().project.name}-${prefix}`;
  const email = `qa-${prefix}-${suffix}@example.test`;
  const response = await request.post('/api/auth/signup', {
    data: { name: `QA ${prefix}`, email, password },
  });
  expect(response.ok()).toBeTruthy();
  return { email, suffix };
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedNetWorth(page, suffix) {
  return page.evaluate(async ({ suffix }) => {
    const api = async (url, body) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(`${url} failed: ${response.status} ${JSON.stringify(json)}`);
      }
      return json.data;
    };

    const brl = await api('/api/accounts', {
      name: `Conta BRL ${suffix}`.slice(0, 50),
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#64748B',
      icon: 'wallet',
    });
    const usd = await api('/api/accounts', {
      name: `Conta USD ${suffix}`.slice(0, 50),
      type: 'CREDIT_DEBIT',
      currency: 'USD',
      color: '#64748B',
      icon: 'wallet',
    });
    const investment = await api('/api/accounts', {
      name: `Investimento BRL ${suffix}`.slice(0, 50),
      type: 'INVESTMENT',
      currency: 'BRL',
      color: '#64748B',
      icon: 'chart-line',
    });
    const income = await api('/api/categories', {
      name: `Receita NW ${suffix}`.slice(0, 50),
      type: 'INCOME',
      color: '#16A34A',
      icon: 'money-bill',
    });

    const today = new Date();
    const date = {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: 1,
    };

    await api('/api/transactions', {
      description: `Patrimônio BRL ${suffix}`,
      amount: 123450,
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: brl.id,
      categoryId: income.id,
      ...date,
    });
    await api('/api/transactions', {
      description: `Patrimônio USD ${suffix}`,
      amount: 10000,
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: usd.id,
      categoryId: income.id,
      ...date,
    });
    await api('/api/transactions', {
      description: `Aporte investimento ${suffix}`,
      amount: 50000,
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: investment.id,
      categoryId: income.id,
      ...date,
    });

    const asset = await api('/api/investments/assets', {
      symbol: `NW${suffix.replace(/[^A-Za-z0-9]/g, '').slice(-10)}`,
      name: `Ativo NW ${suffix}`.slice(0, 100),
      type: 'STOCK',
      currency: 'BRL',
      market: 'B3',
      taxLocation: 'BRAZIL',
    });
    await api('/api/investments/operations', {
      type: 'BUY',
      accountId: investment.id,
      assetId: asset.id,
      quantity: '10',
      unitPriceCents: 3000,
      feesCents: 0,
      date: `${date.year}-${String(date.month).padStart(2, '0')}-01`,
      note: 'Posição E2E Patrimônio',
    });

    const debt = await api('/api/debts', {
      name: `Dívida NW ${suffix}`.slice(0, 100),
      currency: 'BRL',
      balance: 20000,
      institution: 'Banco E2E',
    });

    return { brl, usd, investment, debt };
  }, { suffix });
}

test('patrimônio é protegido no acesso direto sem sessão', async ({ page }) => {
  await page.goto('/patrimonio');
  await expect(page).toHaveURL(/\/login$/);
});

test('patrimônio explicita valuation atual, histórico contábil e multi-moeda', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const { email, suffix } = await signup(request, 'net-worth');
  await login(page, email);
  const seeded = await seedNetWorth(page, suffix);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/patrimonio');

  await expect(page.getByRole('heading', { name: 'Patrimônio', exact: true })).toBeVisible();
  await expect(page.getByText('base mista', { exact: true })).toBeVisible();
  await expect(page.getByText(/Composição não conciliada/)).toBeVisible();
  await expect(page.getByText('Investimento · posições a custo', { exact: true })).toBeVisible();

  const hero = page.locator('article').filter({ hasText: 'Patrimônio líquido em BRL' }).first();
  await expect(hero).toContainText(/1\.334,50/);

  const history = page.locator('article').filter({ hasText: 'Evolução contábil mensal' }).first();
  await expect(history).toContainText(/saldo transacional/i);
  await expect(history).toContainText(/mesmo método de valuation/i);
  await history.getByText('Ver valores em tabela', { exact: true }).click();
  await expect(history).toContainText(/1\.534,50/);

  await page.getByRole('button', { name: 'USD', exact: true }).click();
  const usdHero = page.locator('article').filter({ hasText: 'Patrimônio líquido em USD' }).first();
  await expect(usdHero).toContainText(/100,00/);
  await expect(page.getByText('USD nominal', { exact: true })).toBeVisible();

  await page.getByLabel('Consolidar patrimônio em').selectOption('BRL');
  await expect(page.getByText(/Faltam taxas/)).toBeVisible();

  const now = new Date();
  const iso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  await page.getByLabel('Moeda de origem da taxa').selectOption('USD');
  await page.getByLabel('Moeda de destino da taxa').selectOption('BRL');
  await page.getByLabel('Valor da taxa manual').fill('5,00');
  await page.getByLabel('Data de referência da taxa').fill(iso);
  await page.getByRole('button', { name: 'Salvar manual', exact: true }).click();
  await expect(page.getByText('Patrimônio convertido', { exact: true })).toBeVisible();
  await expect(page.getByText(/1\.834,50/)).toBeVisible();

  await page.getByRole('button', { name: /Excluir taxa USD para BRL/ }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Excluir taxa manual?' });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Excluir taxa', exact: true }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByText(/Faltam taxas/)).toBeVisible();

  const debtLink = page.locator(`a[href="/dividas#debt-${seeded.debt.id}"]`);
  await expect(debtLink).toBeVisible();

  for (const width of [320, 360, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }

  const hidden = await page.evaluate(async () => {
    const response = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showValues: false }),
    });
    return response.ok;
  });
  expect(hidden).toBe(true);
  await page.reload();
  await expect(
    page.locator('article').filter({ hasText: 'Patrimônio líquido em BRL' }).first(),
  ).toContainText('••••');
});

test('falha da evolução real não apaga patrimônio nominal', async ({ page, request }) => {
  test.setTimeout(90_000);
  const { email, suffix } = await signup(request, 'net-worth-partial');
  await login(page, email);
  await seedNetWorth(page, suffix);

  await page.route(/\/api\/net-worth\?.*includeRealEvolution=1/, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data.realEvolution = {
      data: null,
      error: 'Falha parcial E2E do IPCA',
    };
    await route.fulfill({ response, json });
  });

  await page.goto('/patrimonio');
  await expect(page.getByText('Falha parcial E2E do IPCA', { exact: true })).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: 'Patrimônio líquido em BRL' }).first(),
  ).toBeVisible();
});
