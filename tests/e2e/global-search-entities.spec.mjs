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

test('busca global: entidades por usuário e destinos contextuais', async ({ page }) => {
  test.setTimeout(120_000);
  const unique = `BuscaEnt${Date.now().toString(36)}`;
  const email = `qa-search-entities-${unique.toLowerCase()}@example.test`;
  await createVerifiedUser({ name: 'QA Busca Entidades', email, password });
  await login(page, email);

  const entities = await page.evaluate(async (marker) => {
    async function create(path, body) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(payload)}`);
      return payload.data;
    }
    const [merchant, tag, template, debt, goal, account, category] = await Promise.all([
      create('/api/merchants', { name: `${marker} Loja` }),
      create('/api/tags', { name: marker }),
      create('/api/transaction-templates', { name: `${marker} Modelo`, type: 'EXPENSE', description: '', amount: null }),
      create('/api/debts', { name: `${marker} Dívida`, currency: 'BRL', balance: 987654 }),
      create('/api/goals', { name: `${marker} Meta`, targetAmount: 987654, currency: 'BRL' }),
      create('/api/accounts', { name: `${marker} Conta`, type: 'CREDIT_DEBIT', currency: 'BRL', description: null, isActive: true }),
      create('/api/categories', { name: `${marker} Categoria`, type: 'EXPENSE', color: '#EF4444', icon: 'tag', position: 0 }),
    ]);
    const rule = await create('/api/import-rules', {
      name: `${marker} Regra`, isActive: true, priority: 0,
      transactionType: 'EXPENSE', descriptionOperator: 'CONTAINS',
      descriptionPattern: marker, accountId: account.id, categoryId: category.id,
      minAmountCents: null, maxAmountCents: null,
    });
    const alias = await create('/api/merchant-aliases', {
      merchantId: merchant.id, pattern: `${marker} Trip`, operator: 'CONTAINS',
    });
    const now = new Date();
    const transaction = await create('/api/transactions', {
      accountId: account.id, categoryId: category.id,
      merchantId: merchant.id, tagIds: [tag.id],
      amount: 987654, description: 'Corrida aplicativo',
      year: now.getFullYear(), month: now.getMonth() + 1,
      day: Math.min(now.getDate(), 28), type: 'EXPENSE', status: 'COMPLETED',
    });
    return { merchant, tag, template, debt, goal, rule, alias, transaction };
  }, unique);

  for (const [term, matchReason] of [
    [`${unique} Loja`, `${unique} Loja`],
    [`${unique} Trip`, `Alias: ${unique} Trip`],
    [`#${unique}`, `#${unique}`],
  ]) {
    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog', { name: 'Busca global' });
    const input = dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
    await input.fill(term);
    const transactionResult = dialog.getByRole('button', { name: /Corrida aplicativo/ });
    await expect(transactionResult).toBeVisible();
    await expect(transactionResult).toContainText(matchReason);
    await input.press('Escape');
  }

  const destinations = [
    { name: `${unique} Loja`, title: `${unique} Loja`, path: '/estabelecimentos', group: 'MERCHANT', key: 'merchantId', id: entities.merchant.id },
    { name: `#${unique}`, title: `#${unique}`, path: '/tags', group: 'TAG', key: 'tagId', id: entities.tag.id },
    { name: `${unique} Modelo`, title: `${unique} Modelo`, path: '/modelos', group: 'TEMPLATE', key: 'templateId', id: entities.template.id },
    { name: `${unique} Dívida`, title: `${unique} Dívida`, path: '/dividas', group: 'DEBT', key: 'debtId', id: entities.debt.id },
    { name: `${unique} Meta`, title: `${unique} Meta`, path: '/metas', group: 'GOAL', key: 'goalId', id: entities.goal.id },
    { name: `${unique} Regra`, title: `${unique} Regra`, path: '/transacoes/importar/regras', group: 'IMPORT_RULE', key: 'ruleId', id: entities.rule.id },
  ];

  // A identidade da Tag é a mesma com e sem o prefixo visual #.
  await page.keyboard.press('Control+K');
  const tagDialog = page.getByRole('dialog', { name: 'Busca global' });
  const tagInput = tagDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
  await tagInput.fill(unique);
  await expect(tagDialog.locator('[aria-labelledby="global-search-group-TAG"]').getByText(`#${unique}`, { exact: true })).toBeVisible();
  await tagInput.fill(`#${unique}`);
  await expect(tagDialog.getByText(`#${unique}`, { exact: true })).toBeVisible();
  await tagInput.press('Escape');

  for (const item of destinations) {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog', { name: 'Busca global' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras').fill(item.name);
    const resultGroup = dialog.locator(`[aria-labelledby="global-search-group-${item.group}"]`);
    await expect(resultGroup.getByText(item.title, { exact: true })).toBeVisible();
    await resultGroup.getByRole('button').first().click();
    await expect(page).toHaveURL((url) =>
      url.pathname === item.path && url.searchParams.get(item.key) === item.id,
    );
  }
  // Itens inativos continuam localizáveis sem perder o contexto.
  const archived = await page.evaluate(async (id) => {
    const response = await fetch(`/api/merchants/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    return { status: response.status, body: await response.json() };
  }, entities.merchant.id);
  expect(archived.status).toBe(200);
  await page.goto('/dashboard');
  await page.keyboard.press('Control+K');
  const inactiveDialog = page.getByRole('dialog', { name: 'Busca global' });
  await inactiveDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras').fill(`${unique} Loja`);
  const inactiveMerchant = inactiveDialog.getByRole('button', { name: new RegExp(`${unique} Loja.*Inativo`) });
  await expect(inactiveMerchant).toBeVisible();
  await inactiveDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras').press('Escape');

  // Um dado exatamente igual deve ganhar de matches alfabéticos mais fracos.
  const rankingTerm = `BuscaRank${unique}`;
  const exactMerchantId = await page.evaluate(async (name) => {
    async function createMerchant(value) {
      const response = await fetch('/api/merchants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value }),
      });
      if (!response.ok) throw new Error(JSON.stringify(await response.json()));
      return (await response.json()).data.id;
    }
    for (let i = 0; i < 7; i += 1) {
      await createMerchant(`A${i} ${name}`);
    }
    return createMerchant(name);
  }, rankingTerm);
  await page.goto('/dashboard');
  await page.keyboard.press('Control+K');
  const rankDialog = page.getByRole('dialog', { name: 'Busca global' });
  const rankInput = rankDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
  await rankInput.fill(rankingTerm);
  await expect(rankDialog.getByText(rankingTerm, { exact: true })).toBeVisible();
  await rankInput.press('Enter');
  await expect(page).toHaveURL((url) =>
    url.pathname === '/estabelecimentos' && url.searchParams.get('merchantId') === exactMerchantId,
  );

  // Acentos são preservados na identidade e busca pelo nome original.
  const accentedTag = `Café${unique}`;
  await page.evaluate(async (name) => {
    const response = await fetch('/api/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(JSON.stringify(await response.json()));
  }, accentedTag);
  await page.goto('/dashboard');
  await page.keyboard.press('Control+K');
  const accentDialog = page.getByRole('dialog', { name: 'Busca global' });
  await accentDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras').fill(`#${accentedTag}`);
  await expect(accentDialog.getByText(`#${accentedTag}`, { exact: true })).toBeVisible();

});
