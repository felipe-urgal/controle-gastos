import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedAccounts(page, suffix) {
  return page.evaluate(async (seedSuffix) => {
    async function create(data) {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(`account create failed with ${response.status}: ${JSON.stringify(body)}`);
      }
      return body.data;
    }

    const banks = [];
    for (let index = 0; index < 11; index += 1) {
      banks.push(
        await create({
          name: `Banco E2E ${index} ${seedSuffix}`.slice(0, 50),
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          color: '#3B82F6',
          icon: 'wallet',
          description: null,
          isActive: true,
        }),
      );
    }

    const card = await create({
      name: `Cartão E2E ${seedSuffix}`.slice(0, 50),
      type: 'CREDIT_CARD',
      currency: 'BRL',
      color: '#7C3AED',
      icon: 'credit-card',
      description: null,
      isActive: true,
      creditLimit: 250000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });

    return { banks, card };
  }, suffix);
}

test('contas: pagina além de 10 no mobile e cartão é navegável no desktop', async ({ page, request }) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-accounts-${suffix}@example.test`;

  const signup = await request.post('/api/auth/signup', {
    data: {
      name: 'QA Contas',
      email,
      password,
    },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, email);
  const fixture = await seedAccounts(page, suffix);

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/contas');

  await expect(page.getByRole('heading', { name: 'Contas', exact: true })).toBeVisible();
  const pagination = page.getByRole('navigation', { name: 'Paginação', exact: true });
  await expect(pagination).toBeVisible();
  await expect(pagination).toContainText('1–10 de 12');

  await pagination.getByRole('button', { name: 'Página 2', exact: true }).click();
  await expect(pagination).toContainText('11–12 de 12');
  await expect(page.getByText(fixture.banks[0].name, { exact: true }).first()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/contas');

  const cardFilter = page.getByRole('button', { name: /Cartões · 1/ });
  await expect(cardFilter).toBeVisible();
  await cardFilter.click();

  const cardRow = page.getByRole('button').filter({ hasText: fixture.card.name }).first();
  await expect(cardRow).toBeVisible();
  await cardRow.click();

  const invoicesLink = page.getByRole('link', { name: 'Faturas', exact: true });
  await expect(invoicesLink).toBeVisible();
  await invoicesLink.click();

  await expect(page).toHaveURL(new RegExp(`/contas/show/${fixture.card.id}$`));
  await expect(page.getByRole('heading', { name: fixture.card.name, exact: true }).first()).toBeVisible();
  await expect(page.getByText('Limite total', { exact: true })).toBeVisible();
});
