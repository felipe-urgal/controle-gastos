import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('busca global: entidades por usuário e destinos contextuais', async ({ page, request }) => {
  test.setTimeout(120_000);
  const unique = `BuscaEnt${Date.now().toString(36)}`;
  const email = `qa-search-entities-${unique}@example.test`;
  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA Busca Entidades', email, password },
  });
  expect(signup.ok()).toBeTruthy();
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
      create('/api/accounts', { name: `${marker} Conta`, type: 'CREDIT_DEBIT', currency: 'BRL', isActive: true }),
      create('/api/categories', { name: `${marker} Categoria`, type: 'EXPENSE', color: '#EF4444', icon: 'tag', position: 0 }),
    ]);
    const rule = await create('/api/import-rules', {
      name: `${marker} Regra`, isActive: true, priority: 0,
      transactionType: 'EXPENSE', descriptionOperator: 'CONTAINS',
      descriptionPattern: marker, accountId: account.id, categoryId: category.id,
    });
    return { merchant, tag, template, debt, goal, rule };
  }, unique);

  const destinations = [
    { name: `${unique} Loja`, title: `${unique} Loja`, path: '/estabelecimentos', key: 'merchantId', id: entities.merchant.id },
    { name: `#${unique}`, title: `#${unique}`, path: '/tags', key: 'tagId', id: entities.tag.id },
    { name: `${unique} Modelo`, title: `${unique} Modelo`, path: '/modelos', key: 'templateId', id: entities.template.id },
    { name: `${unique} Dívida`, title: `${unique} Dívida`, path: '/dividas', key: 'debtId', id: entities.debt.id },
    { name: `${unique} Meta`, title: `${unique} Meta`, path: '/metas', key: 'goalId', id: entities.goal.id },
    { name: `${unique} Regra`, title: `${unique} Regra`, path: '/transacoes/importar/regras', key: 'ruleId', id: entities.rule.id },
  ];

  for (const item of destinations) {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog', { name: 'Busca global' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras').fill(item.name);
    await expect(dialog.getByText(item.title, { exact: true })).toBeVisible();
    await dialog.getByText(item.title, { exact: true }).click();
    await expect(page).toHaveURL((url) =>
      url.pathname === item.path && url.searchParams.get(item.key) === item.id,
    );
  }
});
