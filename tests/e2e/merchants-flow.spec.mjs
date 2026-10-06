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

async function createUserAndLogin(page, prefix) {
  const suffix = String(Date.now()) + '-' + test.info().project.name;
  const email = prefix + '-' + suffix + '@example.test';
  await createVerifiedUser({ name: 'QA Estabelecimentos', email, password });
  await login(page, email);
  return suffix;
}

async function seedFinance(page, suffix) {
  return page.evaluate(async ({ seedSuffix }) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(url + ' failed: ' + JSON.stringify(body));
      }
      return body.data;
    }

    const account = await create('/api/accounts', {
      name: 'Conta merchant ' + seedSuffix,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#334155',
      icon: 'wallet',
      description: null,
      isActive: true,
    });
    const category = await create('/api/categories', {
      name: ('Compras merchant ' + seedSuffix).slice(0, 50),
      type: 'EXPENSE',
      color: '#64748B',
      icon: 'tag',
      description: null,
      isActive: true,
      position: 0,
    });
    const merchantA = await create('/api/merchants', {
      name: 'Merchant A ' + seedSuffix,
    });
    const merchantB = await create('/api/merchants', {
      name: 'Merchant B ' + seedSuffix,
    });

    return { account, category, merchantA, merchantB };
  }, { seedSuffix: suffix });
}

async function createAlias(page, input) {
  return page.evaluate(async (data) => {
    const response = await fetch('/api/merchant-aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(body));
    return body.data;
  }, input);
}

test('estabelecimentos: acesso direto sem sessão redireciona para login', async ({
  page,
}) => {
  await page.goto('/estabelecimentos');
  await expect(page).toHaveURL(/\/login$/);
});

test('estabelecimentos: CRUD de alias, conflito, move e mobile sem overflow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const suffix = await createUserAndLogin(page, 'qa-merchants-admin');

  await page.goto('/estabelecimentos');
  await expect(
    page.getByRole('heading', { name: 'Estabelecimentos', exact: true }),
  ).toBeVisible();

  const merchantA = 'Loja A ' + suffix;
  const merchantB = 'Loja B ' + suffix;

  for (const name of [merchantA, merchantB]) {
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async function selectAliasMerchant(name) {
    const search = page.getByLabel('Buscar estabelecimento', { exact: true });
    await search.fill(name);
    const select = page.getByLabel('Estabelecimento do alias', { exact: true });
    await expect(select.locator('option', { hasText: name })).toHaveCount(1);
    await select.selectOption({ label: name });
  }

  await selectAliasMerchant(merchantA);
  await page.getByLabel('Operador do alias', { exact: true }).selectOption('EQUALS');
  await page.getByLabel('Padrão', { exact: true }).fill('IFOOD');
  await page.getByLabel('Testar contra descrição', { exact: true }).fill('IFOOD');
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByText('Teste da descrição', { exact: true })).toBeVisible();
  await expect(page.getByText(/O novo alias corresponde à descrição/)).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar alias', exact: true }).click();
  await expect(page.getByText('IFOOD', { exact: false }).first()).toBeVisible();

  await selectAliasMerchant(merchantB);
  await page.getByLabel('Operador do alias', { exact: true }).selectOption('EQUALS');
  await page.getByLabel('Padrão', { exact: true }).fill('ifood');
  await page.getByRole('button', { name: 'Adicionar alias', exact: true }).click();

  await expect(
    page.getByText('Alias equivalente já cadastrado', { exact: true }),
  ).toBeVisible();
  const move = page.getByRole('button', {
    name: 'Mover alias para ' + merchantB,
    exact: true,
  });
  await expect(move).toBeVisible();
  await move.click();

  const aliasList = page
    .getByRole('heading', { name: 'Aliases de reconhecimento', exact: true })
    .locator('..')
    .locator('..');
  await expect(aliasList).toContainText(merchantB);
  await expect(aliasList).toContainText('IFOOD');

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 780 });
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      shortButtons: Array.from(document.querySelectorAll('button'))
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && rect.width > 0 && rect.height > 0;
        })
        .filter((element) => element.getBoundingClientRect().height < 44)
        .map((element) => ({
          text: element.textContent?.trim() ?? '',
          height: element.getBoundingClientRect().height,
        })),
    }));
    expect(metrics.overflow).toBe(false);
    expect(metrics.shortButtons).toEqual([]);
  }
});

test('transação: auto-match é visível, reversível e não reaplica após escolha manual', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const suffix = await createUserAndLogin(page, 'qa-merchants-match');
  const seeded = await seedFinance(page, suffix);

  await createAlias(page, {
    merchantId: seeded.merchantA.id,
    operator: 'EQUALS',
    pattern: 'AUTO MATCH ' + suffix,
    priority: 100,
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/transacoes/nova');

  const form = page.getByRole('region', { name: 'Nova transação', exact: true });
  await form.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: seeded.account.name, exact: true }).click();
  await form.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: seeded.category.name, exact: true }).click();

  await form
    .getByRole('textbox', { name: 'Descrição', exact: true })
    .fill('AUTO MATCH ' + suffix);

  await expect(form.getByText('Reconhecido por alias', { exact: true })).toBeVisible();
  await expect(form).toContainText(seeded.merchantA.name);

  await form.getByRole('button', { name: 'Estabelecimento', exact: true }).click();
  await page.getByRole('option', { name: 'Sem estabelecimento', exact: true }).click();
  await expect(form.getByText('Reconhecido por alias', { exact: true })).toHaveCount(0);

  await form
    .getByRole('textbox', { name: 'Descrição', exact: true })
    .fill('AUTO MATCH ' + suffix + ' ');
  await page.waitForTimeout(500);

  await expect(form).not.toContainText(seeded.merchantA.name);
  await expect(form.getByText('Reconhecido por alias', { exact: true })).toHaveCount(0);
});

test('importação: conflito é resolvido, aprendido e próxima descrição reconhece o destino', async ({
  page,
}) => {
  test.setTimeout(150_000);
  const suffix = await createUserAndLogin(page, 'qa-merchants-import');
  const seeded = await seedFinance(page, suffix);
  const description = 'IMPORT MATCH ' + suffix;

  await createAlias(page, {
    merchantId: seeded.merchantA.id,
    operator: 'EQUALS',
    pattern: description,
    priority: 100,
  });
  await createAlias(page, {
    merchantId: seeded.merchantB.id,
    operator: 'CONTAINS',
    pattern: 'MATCH ' + suffix,
    priority: 100,
  });

  await page.goto('/transacoes/importar');
  await page.getByLabel('Conta', { exact: true }).selectOption(seeded.account.id);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'merchant-conflict.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'data,descricao,valor\n2026-08-31,' + description + ',-10.01',
      'utf8',
    ),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  await expect(page.getByText('Conflito entre aliases — nenhum será aplicado', { exact: true })).toBeVisible();
  const detail = page.getByRole('complementary').filter({ hasText: description }).first();
  await detail.getByLabel('Categoria', { exact: true }).selectOption(seeded.category.id);
  await detail.getByLabel('Estabelecimento', { exact: true }).selectOption(seeded.merchantB.id);
  await detail.getByText('Aprender esta descrição para próximas importações', { exact: true }).click();

  await page.getByRole('button', { name: /Confirmar 1/, exact: false }).click();
  await expect(page.getByText('Importação concluída', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Importar outro arquivo', exact: true }).click();
  await page.getByLabel('Conta', { exact: true }).selectOption(seeded.account.id);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'merchant-learned.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'data,descricao,valor\n2026-09-01,' + description + ',-11.01',
      'utf8',
    ),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  await expect(page.getByText(seeded.merchantB.name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Conflito entre aliases — nenhum será aplicado', { exact: true })).toHaveCount(0);
});
