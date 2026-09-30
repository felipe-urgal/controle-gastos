import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

const password = 'Playwright123!';

async function createVerifiedUser(email) {
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
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function login(page, email) {
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
      'Por segurança, dados financeiros e respostas da API não são armazenados para uso offline.',
      { exact: false },
    ),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Você está offline' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Por segurança, dados financeiros e respostas da API não são armazenados para uso offline.',
      { exact: false },
    ),
  ).toBeVisible();

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login$/);
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
  await expect(queuePanel).toContainText('Erro');

  const draftAfterFailedSend = await page.evaluate((userId) =>
    localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    ),
  owner);
  expect(draftAfterFailedSend).not.toBeNull();

  await queuePanel
    .getByRole('button', { name: 'Sincronizar', exact: true })
    .click();

  await expect(queuePanel).toContainText('Sincronizado');
  await expect(
    page.getByRole('status', { name: 'Rascunho offline' }),
  ).toHaveCount(0);

  const draftAfterRetry = await page.evaluate((userId) =>
    localStorage.getItem(
      `controle-gastos:offline-transaction-draft:v1:${userId}`,
    ),
  owner);
  expect(draftAfterRetry).toBeNull();

  await queuePanel
    .getByRole('button', { name: 'Limpar', exact: true })
    .click();
  await expect(queuePanel).toHaveCount(0);

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
