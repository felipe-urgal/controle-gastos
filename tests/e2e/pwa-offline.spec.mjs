import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { setIsolatedClientIp } from './support/client-ip.mjs';

const password = 'Playwright123!';

async function createVerifiedUser(email, extra = {}) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await prisma.user.create({
      data: {
        name: 'PWA Draft E2E',
        email,
        password: await bcrypt.hash(password, 12),
        emailVerifiedAt: new Date(),
        ...extra,
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function login(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function waitForServiceWorker(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;

    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, 5_000);
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }

    return Boolean(navigator.serviceWorker.controller);
  });
}

test('instala shell offline sem persistir páginas ou APIs financeiras', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  expect(await waitForServiceWorker(page)).toBe(true);

  const cacheNames = await page.evaluate(() => caches.keys());
  const cacheState = await page.evaluate(async () => {
    const urls = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => new URL(request.url).pathname));
    }
    return urls;
  });

  expect(cacheState).toContain('/offline.html');
  expect(cacheState).toContain('/offline-transacao.html');
  expect(cacheNames).toEqual(
    expect.arrayContaining([
      'controle-gastos-shell-v3',
    ]),
  );
  expect(cacheNames.some((name) => name.endsWith('-v2'))).toBe(false);
  expect(cacheState).toContain('/manifest.json');
  expect(cacheState.some((url) => url.startsWith('/api/'))).toBe(false);
  expect(cacheState).not.toContain('/login');
  expect(cacheState).not.toContain('/dashboard');

  await context.setOffline(true);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Você está offline' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Páginas financeiras e respostas da API não são armazenadas para uso offline.',
      { exact: false },
    ),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Você está offline' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Páginas financeiras e respostas da API não são armazenadas para uso offline.',
      { exact: false },
    ),
  ).toBeVisible();

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login(\?next=[^#]*)?$/);
});

test('salva rascunho offline e exige confirmação online antes de criar', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `pwa-draft-${suffix}@example.test`;
  const accountName = `Conta PWA ${suffix}`;
  const categoryName = `Categoria PWA ${suffix}`;
  const description = `Mercado offline ${suffix}`;

  await createVerifiedUser(email);
  await login(page, email);

  await page.evaluate(
    async ({ accountName: account, categoryName: category }) => {
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

      await create('/api/accounts', {
        name: account,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        color: '#22C55E',
        icon: 'wallet',
        description: 'Conta do E2E offline',
        isActive: true,
      });

      await create('/api/categories', {
        name: category,
        type: 'EXPENSE',
        color: '#EF4444',
        icon: 'tag',
        description: 'Categoria do E2E offline',
        isActive: true,
        position: 0,
      });
    },
    { accountName, categoryName },
  );

  expect(await waitForServiceWorker(page)).toBe(true);

  const owner = await page.evaluate(() =>
    localStorage.getItem('controle-gastos:offline-draft-owner:v1'),
  );
  expect(owner).toBeTruthy();

  await context.setOffline(true);
  await page.goto('/transacoes/nova', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Salvar rascunho de transação' }),
  ).toBeVisible();

  await page.getByLabel('Valor', { exact: true }).fill('123,45');
  await page.getByLabel('Descrição', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();

  await expect(page.getByRole('status')).toContainText(
    'Rascunho salvo. Ao reconectar',
  );

  const storedDraft = await page.evaluate((userId) => {
    const raw = localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    );
    return raw ? JSON.parse(raw) : null;
  }, owner);

  expect(storedDraft).toMatchObject({
    ownerUserId: owner,
    type: 'EXPENSE',
    amount: 12_345,
    description,
  });

  await context.setOffline(false);
  await page.goto('/transacoes/nova');

  const draftNotice = page.getByRole('status', { name: 'Rascunho offline' });
  await expect(draftNotice).toBeVisible();
  await expect(draftNotice).toContainText('Rascunho offline encontrado');
  await expect(draftNotice).toContainText(description);

  await draftNotice
    .getByRole('button', { name: 'Continuar rascunho', exact: true })
    .click();

  await expect(draftNotice).toContainText('Rascunho offline carregado');
  await expect(page.getByLabel(/^Descrição\b/).last()).toHaveValue(description);

  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: categoryName, exact: true }).click();

  let failFirstCreate = true;
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() === 'POST' && failFirstCreate) {
      failFirstCreate = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page
    .getByRole('region', { name: 'Nova transação', exact: true })
    .getByRole('button', { name: 'Criar transação', exact: true })
    .click();

  const queuePanel = page.getByRole('region', { name: 'Fila de sincronização' });
  await expect(queuePanel).toBeVisible();
  await expect(queuePanel).toContainText(description);
  await expect(queuePanel).toContainText('Falha de conexão');

  const draftAfterFailedSend = await page.evaluate((userId) =>
    localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    ),
  owner);
  expect(draftAfterFailedSend).not.toBeNull();

  await queuePanel
    .getByRole('button', { name: 'Sincronizar', exact: true })
    .click();

  await expect(queuePanel).toHaveCount(0);
  await expect(
    page.getByRole('status', { name: 'Rascunho offline' }),
  ).toHaveCount(0);

  const draftAfterRetry = await page.evaluate((userId) =>
    localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    ),
  owner);
  expect(draftAfterRetry).toBeNull();

  await page.goto('/transacoes');
  await expect(
    page.getByRole('button', {
      name: `Abrir detalhe contextual da transação ${description}`,
      exact: true,
    }),
  ).toBeVisible();

  await page.evaluate((userId) => {
    const now = new Date().toISOString();
    localStorage.setItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
      JSON.stringify({
        version: 1,
        id: 'logout-cleanup',
        ownerUserId: userId,
        type: 'EXPENSE',
        amount: 100,
        description: 'Deve ser removido no logout',
        year: 2026,
        month: 9,
        day: 30,
        createdAt: now,
        updatedAt: now,
      }),
    );
    localStorage.setItem(
      `controle-gastos:offline-transaction-queue:v1:${userId}`,
      JSON.stringify([
        {
          version: 1,
          id: 'queue-logout-cleanup',
          ownerUserId: userId,
          idempotencyKey: 'queue-logout-key',
          payload: {
            amount: 100,
            type: 'EXPENSE',
            description: 'Fila deve ser removida no logout',
            categoryId: '11111111-1111-4111-8111-111111111111',
            accountId: '22222222-2222-4222-8222-222222222222',
            day: 30,
            month: 9,
            year: 2026,
            status: 'COMPLETED',
          },
          status: 'error',
          lastError: 'offline',
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
  }, owner);

  // First dismissal must preserve the authenticated session and local operations.
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Sair apagará definitivamente');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true }).first()).toBeVisible();
  expect(await page.evaluate((userId) => Boolean(localStorage.getItem(
    `controle-gastos:offline-transaction-queue:v1:${userId}`,
  )), owner)).toBe(true);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('sair e descartar');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);

  const localStateAfterLogout = await page.evaluate((userId) => ({
    owner: localStorage.getItem('controle-gastos:offline-draft-owner:v1'),
    draft: localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    ),
    queue: localStorage.getItem(
      `controle-gastos:offline-transaction-queue:v1:${userId}`,
    ),
  }), owner);

  expect(localStateAfterLogout).toEqual({
    owner: null,
    draft: null,
    queue: null,
  });
});

test('rascunho offline valida limites antes de salvar e preserva rascunho legado', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);

  const email = `pwa-limits-${Date.now()}-${test.info().retry}@example.test`;
  // showValues=false aproveita este login: o IP de CI tem limite de 30 logins por janela.
  await createVerifiedUser(email, { showValues: false });
  await login(page, email);
  expect(await waitForServiceWorker(page)).toBe(true);

  const owner = await page.evaluate(() =>
    localStorage.getItem('controle-gastos:offline-draft-owner:v1'),
  );
  expect(owner).toBeTruthy();
  const draftKey = `controle-gastos:offline-transaction-draft:v1:${owner}`;
  const readDraft = () => page.evaluate((key) => localStorage.getItem(key), draftKey);

  await context.setOffline(true);
  await page.goto('/transacoes/nova', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Salvar rascunho de transação' }),
  ).toBeVisible();

  const save = page.getByRole('button', { name: 'Salvar rascunho', exact: true });
  const status = page.getByRole('status');
  const amountField = page.getByLabel('Valor', { exact: true });
  const descriptionField = page.getByLabel('Descrição', { exact: true });
  const dateField = page.getByLabel('Data', { exact: true });
  const amountError = page.locator('#amount-error');
  const dateError = page.locator('#date-error');
  const descriptionError = page.locator('#description-error');

  // Dois campos inválidos: cada erro fica no seu campo e a data válida não é marcada.
  await descriptionField.fill('x'.repeat(101));
  await amountField.fill('10000000,01');
  await save.click();
  await expect(status).toContainText('Corrija os campos indicados');
  await expect(amountError).toContainText('excede o limite');
  await expect(descriptionError).toContainText('não pode exceder 100');
  await expect(amountField).toHaveAttribute('aria-invalid', 'true');
  await expect(amountField).toHaveAttribute('aria-describedby', 'amount-error');
  await expect(descriptionField).toHaveAttribute('aria-invalid', 'true');
  await expect(descriptionField).toHaveAttribute('aria-describedby', 'description-error');
  await expect(dateField).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(dateField).not.toHaveAttribute('aria-describedby', /.*/);
  await expect(dateError).toBeEmpty();
  await expect(amountField).toBeFocused();
  expect(await readDraft()).toBeNull();

  // Digitar revalida o campo: a mensagem acompanha o estado real, sem sumir às cegas.
  await descriptionField.fill('x');
  await expect(descriptionError).toContainText('pelo menos 2');
  await descriptionField.fill('x'.repeat(100));
  await expect(descriptionError).toBeEmpty();
  await expect(descriptionField).not.toHaveAttribute('aria-invalid', /.*/);
  await amountField.fill('10000000,02');
  await expect(amountError).toContainText('excede o limite');
  await expect(amountField).toHaveAttribute('aria-invalid', 'true');

  await amountField.fill('0');
  await save.click();
  await expect(amountError).toContainText('maior que zero');
  await expect(descriptionError).toBeEmpty();
  expect(await readDraft()).toBeNull();

  // Valor exatamente no teto e descrição com 100 caracteres são aceitos.
  await amountField.fill('10000000,00');
  await save.click();
  await expect(status).toContainText('Rascunho salvo');
  await expect(amountError).toBeEmpty();
  await expect(amountField).not.toHaveAttribute('aria-invalid', /.*/);
  expect(JSON.parse(await readDraft())).toMatchObject({ amount: 1_000_000_000 });

  // Rascunho legado (255 caracteres): é mantido e sinalizado, não apagado.
  const legacy = {
    version: 1,
    id: 'legacy-1',
    ownerUserId: owner,
    type: 'INCOME',
    amount: 5_000,
    description: 'y'.repeat(255),
    year: 2026,
    month: 9,
    day: 30,
    createdAt: '2026-09-30T12:00:00.000Z',
    updatedAt: '2026-09-30T12:00:00.000Z',
  };
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: draftKey, value: legacy },
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(status).toContainText('precisa de revisão');
  await expect(descriptionError).toContainText('não pode exceder 100');
  await expect(descriptionField).toHaveAttribute('aria-invalid', 'true');
  await expect(amountField).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(dateField).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(descriptionField).toHaveValue(legacy.description);
  expect(JSON.parse(await readDraft())).toEqual(legacy);

  await context.setOffline(false);
  await page.goto('/transacoes/nova');
  const notice = page.getByRole('status', { name: 'Rascunho offline' });
  await expect(notice).toContainText('precisa de revisão');
  await expect(notice).toContainText('não pode exceder 100');
  expect(JSON.parse(await readDraft())).toEqual(legacy);

  // showValues=false: o aviso e o badge global não expõem o valor do rascunho.
  await expect(notice).toContainText('••••');
  await expect(notice).not.toContainText('50,00');
  const badge = page.getByTestId('offline-pending-badge').first();
  await expect(badge).toHaveAttribute('aria-label', /1 lançamento local aguardando envio/);
  await expect(badge).not.toContainText('50,00');

  // Continuar o rascunho carrega os dados sem truncar; editar não altera o rascunho salvo.
  await notice.getByRole('button', { name: 'Continuar rascunho', exact: true }).click();
  await expect(notice).toContainText('Rascunho offline carregado');

  const formDescription = page.getByLabel(/^Descrição\b/).last();
  const formAmount = page.getByLabel('Valor', { exact: true }).last();
  const formDate = page.getByLabel('Data', { exact: true }).last();
  const incomeButton = page.getByRole('button', { name: 'Receita', exact: true }).first();

  await expect(formDescription).toHaveValue(legacy.description);
  await expect(formAmount).toHaveValue(/50,00/);
  await expect(formDate).toHaveValue('2026-09-30');
  await expect(incomeButton).toHaveAttribute('aria-pressed', 'true');

  const corrected = 'Descrição corrigida online';
  await formDescription.fill(corrected);

  await expect(formDescription).toHaveValue(corrected);
  await expect(formAmount).toHaveValue(/50,00/);
  await expect(formDate).toHaveValue('2026-09-30');
  await expect(incomeButton).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse(await readDraft())).toEqual(legacy);
});
