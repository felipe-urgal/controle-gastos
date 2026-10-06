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

async function seedRelations(page, suffix) {
  return page.evaluate(async (seedSuffix) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          `${url} failed with ${response.status}: ${JSON.stringify(body)}`,
        );
      }
      return body.data;
    }

    const account = await create('/api/accounts', {
      name: `Conta Modelo ${seedSuffix}`,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#3B82F6',
      icon: 'wallet',
      description: null,
      isActive: true,
    });

    const category = await create('/api/categories', {
      name: `Categoria Modelo ${seedSuffix}`.slice(0, 50),
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });

    return { account, category };
  }, suffix);
}

async function findTransactions(page, description) {
  return page.evaluate(async (query) => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '20',
      search: query,
    });
    const response = await fetch(`/api/transactions?${params.toString()}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `transaction list failed with ${response.status}: ${JSON.stringify(body)}`,
      );
    }
    return body.data.items;
  }, description);
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test('modelos: criar, editar, favoritar, usar com confirmação, salvar origem e excluir sem alterar transação', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-modelos-${suffix}@example.test`;
  const modelName = `Modelo almoço ${suffix}`.slice(0, 80);
  const editedName = `Modelo favorito ${suffix}`.slice(0, 80);
  const description = `Almoço via modelo ${suffix}`.slice(0, 100);

  await createVerifiedUser({ name: 'QA Modelos', email, password });
  await login(page, email);
  const { account, category } = await seedRelations(page, suffix);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/modelos');

  await page.getByLabel('Nome', { exact: true }).fill(modelName);
  await page.getByLabel('Descrição', { exact: true }).fill(description);
  await page.getByLabel('Valor opcional', { exact: true }).fill('123.45');
  await page
    .getByLabel('Conta opcional', { exact: true })
    .selectOption({ label: account.name });
  await page
    .getByLabel('Categoria opcional', { exact: true })
    .selectOption({ label: category.name });
  await page
    .getByRole('button', { name: 'Salvar modelo', exact: true })
    .click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Modelo criado.' }),
  ).toBeVisible();

  let card = page.locator('article').filter({ hasText: modelName });
  await expect(card).toBeVisible();
  await expect(card).toContainText('R$ 123,45');
  await expect(card).toContainText(account.name);
  await expect(card).toContainText(category.name);

  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill(editedName);
  await page
    .getByRole('button', { name: 'Salvar alterações', exact: true })
    .click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Modelo atualizado.' }),
  ).toBeVisible();

  card = page.locator('article').filter({ hasText: editedName });
  await card.getByRole('button', { name: 'Favoritar', exact: true }).click();
  await expect(card).toContainText('★ Favorito');

  await page.goto('/transacoes/nova');
  const favoriteSection = page
    .getByRole('heading', { name: 'Modelos favoritos', exact: true })
    .locator('..')
    .locator('..');
  const favoriteLink = favoriteSection
    .getByRole('link')
    .filter({ hasText: editedName })
    .first();

  await expect(favoriteLink).toBeVisible();
  await favoriteLink.click();
  await expect(page).toHaveURL(/\/transacoes\/nova\?template=/);

  const form = page.getByRole('region', {
    name: 'Nova transação',
    exact: true,
  });
  await expect(
    form.getByRole('textbox', { name: 'Descrição', exact: true }),
  ).toHaveValue(description);

  expect(await findTransactions(page, description)).toHaveLength(0);

  await form
    .getByRole('button', { name: 'Revisar e criar', exact: true })
    .click();

  const review = page.getByRole('dialog', {
    name: 'Revisar transação',
    exact: true,
  });
  await expect(review).toBeVisible();
  await review
    .getByRole('button', { name: 'Criar transação', exact: true })
    .click();
  await expect(page).toHaveURL(/\/transacoes$/);

  const createdTransactions = await findTransactions(page, description);
  expect(createdTransactions).toHaveLength(1);
  const transactionId = createdTransactions[0].id;

  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto(`/transacoes/show/${transactionId}`);
  await page
    .getByRole('link', { name: 'Salvar como modelo', exact: true })
    .click();
  await expect(page).toHaveURL(/\/modelos\?source=/);
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue(
    description,
  );
  await page
    .getByRole('button', { name: 'Salvar modelo', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Modelo criado.' }),
  ).toBeVisible();

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/modelos');
    await expectNoHorizontalOverflow(page);
    const saveButton = page.getByRole('button', {
      name: 'Salvar modelo',
      exact: true,
    });
    const box = await saveButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/modelos');
  await page.getByLabel('Buscar modelos', { exact: true }).fill(editedName);
  card = page.locator('article').filter({ hasText: editedName });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Excluir', exact: true }).click();
  const deleteDialog = page.getByRole('dialog', {
    name: 'Excluir Modelo?',
    exact: true,
  });
  await expect(deleteDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(deleteDialog).toBeHidden();

  await card.getByRole('button', { name: 'Excluir', exact: true }).click();
  await deleteDialog
    .getByRole('button', { name: 'Excluir', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Transações existentes não foram alteradas.' }),
  ).toBeVisible();

  expect(await findTransactions(page, description)).toHaveLength(1);
});

test('modelos: showValues=false oculta valor fixo e acesso sem sessão é protegido', async ({
  page,
}) => {
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-modelos-private-${suffix}@example.test`;
  const privateModelName = `Privado ${suffix}`.slice(0, 80);

  await createVerifiedUser({
    name: 'QA Modelos Privado',
    email,
    password,
    showValues: false,
  });
  await login(page, email);

  const createResponse = await page.evaluate(async (name) => {
    const response = await fetch('/api/transaction-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: 'EXPENSE',
        description: 'Modelo privado',
        amount: 98765,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, privateModelName);

  expect(createResponse.status).toBe(201);

  await page.goto('/modelos');
  await expect(page.getByText('Valor: ••••', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 987,65', { exact: true })).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto('/modelos');
  await expect(page).toHaveURL(/\/login$/);
});
