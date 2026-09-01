import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function seedFinancialRelations(page, { accountName, categoryName }) {
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

    const createdAccount = await create('/api/accounts', {
      name: account,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#22C55E',
      icon: 'wallet',
      description: 'Conta isolada do E2E',
      isActive: true,
    });

    const createdCategory = await create('/api/categories', {
      name: category,
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: 'Categoria isolada do E2E',
      isActive: true,
      position: 0,
    });

    return {
      accountId: createdAccount.id,
      categoryId: createdCategory.id,
    };
  }, { accountName, categoryName });
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('login, fluxo financeiro, sessão inválida e logout', async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-${suffix}@example.test`;
  const accountName = `Conta E2E ${suffix}`;
  const categoryName = `Categoria E2E ${suffix}`;
  const transactionDescription = `Compra E2E ${suffix}`;

  const signupResponse = await request.post('/api/auth/signup', {
    data: {
      name: 'Playwright E2E',
      email,
      password,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await login(page, email);

  const relations = await seedFinancialRelations(page, { accountName, categoryName });
  expect(relations.accountId).toBeTruthy();
  expect(relations.categoryId).toBeTruthy();

  await page.goto('/transacoes/nova');
  await page.getByLabel(/^Conta\b/).selectOption({ label: accountName });
  await page.getByLabel(/^Categoria\b/).selectOption({ label: categoryName });
  await page.getByLabel(/^Valor\b/).fill('12345');
  await page.getByLabel(/^Descrição\b/).fill(transactionDescription);
  await page.getByRole('button', { name: 'Criar transação', exact: true }).click();

  await expect(page).toHaveURL(/\/transacoes$/);
  await expect(
    page.getByRole('link', {
      name: `Abrir detalhes da transação ${transactionDescription}`,
      exact: true,
    }),
  ).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar na sua conta', exact: true })).toBeVisible();

  await login(page, email);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
