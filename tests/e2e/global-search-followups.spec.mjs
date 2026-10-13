import { expect, test } from '@playwright/test';

import { api, createAccount, createCategory, startScenario } from './support/matrix.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const SEARCH_LABEL = 'Buscar em páginas, transações, contas, categorias e regras';
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

async function openSearch(page, term) {
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Busca global' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByLabel(SEARCH_LABEL);
  await input.fill(term);
  return { dialog, input };
}

function previousMonthDate() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  return {
    iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-10`,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: 10,
  };
}

test('busca global: pagamento de fatura aparece como CARD_PAYMENT com o rótulo correto', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const { suffix } = await startScenario(page, testInfo, 'search-card');
  const marker = `BuscaFatura${Date.now().toString(36)}`;

  const payer = await createAccount(page, `Pagadora ${suffix}`);
  const category = await createCategory(page, `Cartão ${suffix}`);
  const card = await api(page, 'POST', '/api/accounts', {
    name: `Cartão ${suffix}`.slice(0, 50),
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
  const purchaseDate = previousMonthDate();
  await api(page, 'POST', '/api/transactions', {
    accountId: card.id,
    categoryId: category.id,
    amount: 12345,
    description: `Compra ${marker}`,
    year: purchaseDate.year,
    month: purchaseDate.month,
    day: purchaseDate.day,
    status: 'COMPLETED',
    type: 'EXPENSE',
  });

  const statements = await api(page, 'GET', `/api/cards/${card.id}/statements?history=12`);
  const open = statements.history.find((item) => item.total === 12345);
  expect(open, JSON.stringify(statements.history)).toBeTruthy();
  const date = open.closingDate;
  const closing = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

  await api(page, 'POST', `/api/cards/${card.id}/payments`, {
    sourceAccountId: payer.id,
    statementClosingDate: closing,
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  await page.goto('/dashboard');
  const { dialog } = await openSearch(page, 'Pagamento');
  const group = dialog.locator('[aria-labelledby="global-search-group-TRANSACTION"]');
  const payment = group.getByRole('button').filter({ hasText: 'Pagamento de fatura' }).first();
  await expect(payment).toBeVisible();
  await expect(payment).toContainText('Pagamento de fatura');
  // Não expõe valor: a busca não retorna `amount`.
  await expect(dialog).not.toContainText('123,45');
  await expect(dialog).not.toContainText('12345');
});

/** Cada destino abre/seleciona o registro correto, não apenas o parâmetro na URL. */
test('busca global: destinos contextuais mostram o registro correto e IDs inválidos são seguros', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  await startScenario(page, testInfo, 'search-dest');
  const marker = `Dest${Date.now().toString(36)}`;

  const account = await createAccount(page, `${marker} Conta`);
  const category = await createCategory(page, `${marker} Categoria`);
  const targets = {};
  targets.merchant = await api(page, 'POST', '/api/merchants', { name: `${marker} Loja Alvo` });
  await api(page, 'POST', '/api/merchants', { name: `${marker} Loja Decoy` });
  targets.tag = await api(page, 'POST', '/api/tags', { name: `${marker}alvo` });
  await api(page, 'POST', '/api/tags', { name: `${marker}decoy` });
  targets.template = await api(page, 'POST', '/api/transaction-templates', {
    name: `${marker} Modelo Alvo`, type: 'EXPENSE', description: '', amount: null,
  });
  await api(page, 'POST', '/api/transaction-templates', {
    name: `${marker} Modelo Decoy`, type: 'EXPENSE', description: '', amount: null,
  });
  targets.debt = await api(page, 'POST', '/api/debts', {
    name: `${marker} Dívida Alvo`, currency: 'BRL', balance: 987654,
  });
  await api(page, 'POST', '/api/debts', { name: `${marker} Dívida Decoy`, currency: 'BRL', balance: 1000 });
  targets.goal = await api(page, 'POST', '/api/goals', {
    name: `${marker} Meta Alvo`, targetAmount: 987654, currency: 'BRL',
  });
  await api(page, 'POST', '/api/goals', { name: `${marker} Meta Decoy`, targetAmount: 1000, currency: 'BRL' });
  const ruleBase = {
    isActive: true, priority: 0, transactionType: 'EXPENSE', descriptionOperator: 'CONTAINS',
    accountId: account.id, categoryId: category.id, minAmountCents: null, maxAmountCents: null,
  };
  targets.rule = await api(page, 'POST', '/api/import-rules', {
    ...ruleBase, name: `${marker} Regra Alvo`, descriptionPattern: `${marker}alvo`,
  });
  await api(page, 'POST', '/api/import-rules', {
    ...ruleBase, name: `${marker} Regra Decoy`, descriptionPattern: `${marker}decoy`,
  });

  // Nome exibido no editor aberto pelo destino contextual (campos ou diálogo).
  const expectations = [
    { key: 'merchant', path: '/estabelecimentos', param: 'merchantId', name: `${marker} Loja Alvo`, decoy: `${marker} Loja Decoy` },
    { key: 'tag', path: '/tags', param: 'tagId', name: `${marker}alvo`, decoy: `${marker}decoy` },
    { key: 'template', path: '/modelos', param: 'templateId', name: `${marker} Modelo Alvo`, decoy: `${marker} Modelo Decoy` },
    { key: 'debt', path: '/dividas', param: 'debtId', name: `${marker} Dívida Alvo`, decoy: `${marker} Dívida Decoy` },
    { key: 'goal', path: '/metas', param: 'goalId', name: `${marker} Meta Alvo`, decoy: `${marker} Meta Decoy` },
    { key: 'rule', path: '/transacoes/importar/regras', param: 'ruleId', name: `${marker} Regra Alvo`, decoy: `${marker} Regra Decoy` },
  ];

  /** Inputs/textareas com valor exatamente igual ao nome + texto de diálogos abertos. */
  async function surfaceShows(name) {
    return page.evaluate((needle) => {
      const fields = [...document.querySelectorAll('input, textarea')].map((el) => el.value);
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].map((el) => el.innerText);
      return fields.includes(needle) || dialogs.some((text) => text.includes(needle));
    }, name);
  }

  for (const item of expectations) {
    await page.goto(`${item.path}?${item.param}=${encodeURIComponent(targets[item.key].id)}`);
    await expect.poll(() => surfaceShows(item.name), { message: `${item.key} alvo` }).toBe(true);
    // O decoy (nome parecido) não é o registro aberto no editor/diálogo.
    expect(await surfaceShows(item.decoy)).toBe(false);
  }

  // IDs inválidos, inexistentes e de outro usuário: página normal, sem editor nem erro.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  const otherEmail = `qa-search-dest-other-${Date.now()}-${testInfo.project.name}@example.test`;
  await createVerifiedUser({ name: 'QA Outro', email: otherEmail, password: 'Playwright123!' });
  await otherPage.goto('/login');
  await otherPage.getByLabel(/^E-mail\b/).fill(otherEmail);
  await otherPage.getByLabel(/^Senha\b/).fill('Playwright123!');
  await otherPage.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(otherPage).toHaveURL(/\/dashboard$/);
  const foreign = {
    merchant: await api(otherPage, 'POST', '/api/merchants', { name: `${marker} Loja Alheia` }),
    tag: await api(otherPage, 'POST', '/api/tags', { name: `${marker}alheia` }),
    template: await api(otherPage, 'POST', '/api/transaction-templates', {
      name: `${marker} Modelo Alheio`, type: 'EXPENSE', description: '', amount: null,
    }),
    debt: await api(otherPage, 'POST', '/api/debts', { name: `${marker} Dívida Alheia`, currency: 'BRL', balance: 5000 }),
    goal: await api(otherPage, 'POST', '/api/goals', { name: `${marker} Meta Alheia`, targetAmount: 5000, currency: 'BRL' }),
  };
  await otherContext.close();
  const foreignNames = {
    merchant: `${marker} Loja Alheia`, tag: `${marker}alheia`, template: `${marker} Modelo Alheio`,
    debt: `${marker} Dívida Alheia`, goal: `${marker} Meta Alheia`,
  };

  for (const item of expectations) {
    const badIds = [MISSING_UUID, 'nao-e-um-uuid'];
    if (foreign[item.key]) badIds.push(foreign[item.key].id);
    for (const badId of badIds) {
      await page.goto(`${item.path}?${item.param}=${encodeURIComponent(badId)}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Algo deu errado')).toHaveCount(0);
      // Nenhum editor/diálogo do registro (nem do alheio) foi aberto.
      expect(await surfaceShows(item.name)).toBe(false);
      if (foreignNames[item.key]) expect(await surfaceShows(foreignNames[item.key])).toBe(false);
      expect(await page.getByRole('dialog').count()).toBe(0);
    }
  }
});
