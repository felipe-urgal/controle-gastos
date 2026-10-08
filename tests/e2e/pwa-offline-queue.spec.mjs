import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { setIsolatedClientIp } from './support/client-ip.mjs';

const password = 'Playwright123!';

// Um único login para toda a suíte: o IP de CI tem limite de 30 logins por janela.
test.describe.configure({ mode: 'serial' });

let page;
let ctx;
let accountId;
let categoryId;
let accountName;
let categoryName;
const suffix = `${Date.now()}`;

async function createUser(email) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.user.create({
      data: {
        name: 'PWA Queue E2E',
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

async function api(method, url, data, headers = {}) {
  return page.evaluate(
    async ({ method: m, url: u, data: d, headers: h }) => {
      const response = await fetch(u, {
        method: m,
        headers: { 'Content-Type': 'application/json', ...h },
        body: d ? JSON.stringify(d) : undefined,
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { method, url, data, headers },
  );
}

async function countByDescription(description) {
  const result = await api('GET', `/api/transactions?search=${encodeURIComponent(description)}&limit=100`);
  const rows = result.body?.data?.transactions ?? result.body?.data?.items ?? result.body?.data ?? [];
  return rows.filter((row) => row.description === description).length;
}

function queuePayload(description) {
  const now = new Date();
  return {
    amount: 4_200,
    type: 'EXPENSE',
    description,
    categoryId,
    accountId,
    day: Math.min(now.getDate(), 28),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: 'COMPLETED',
    allocations: [],
    tagIds: [],
  };
}

async function seedQueue(items) {
  await page.evaluate((entries) => {
    const owner = localStorage.getItem('controle-gastos:offline-draft-owner:v1');
    const now = new Date().toISOString();
    localStorage.setItem(
      `controle-gastos:offline-transaction-queue:v1:${owner}`,
      JSON.stringify(
        entries.map((entry, index) => ({
          version: 1,
          id: entry.id ?? crypto.randomUUID(),
          ownerUserId: owner,
          idempotencyKey: entry.key ?? crypto.randomUUID(),
          payload: entry.payload,
          status: entry.status ?? 'pending',
          failureKind: entry.failureKind,
          errorCode: entry.errorCode,
          lastError: entry.lastError,
          createdAt: now,
          updatedAt: now,
          order: index,
        })),
      ),
    );
  }, items);
  await page.goto('/transacoes/nova');
}

async function readQueue() {
  return page.evaluate(() => {
    const owner = localStorage.getItem('controle-gastos:offline-draft-owner:v1');
    return JSON.parse(localStorage.getItem(`controle-gastos:offline-transaction-queue:v1:${owner}`) ?? '[]');
  });
}

test.beforeAll(async ({ browser }) => {
  // page.route não é confiável com service worker ativo; o SW não participa destes cenários.
  ctx = await browser.newContext({ serviceWorkers: 'block' });
  page = await ctx.newPage();
  await setIsolatedClientIp(page, suffix);
  const email = `pwa-queue-${suffix}@example.test`;
  await createUser(email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  accountName = `Conta Queue ${suffix}`;
  categoryName = `Categoria Queue ${suffix}`;
  const account = await api('POST', '/api/accounts', {
    name: accountName, type: 'CREDIT_DEBIT', currency: 'BRL', color: '#22C55E', icon: 'wallet',
    description: 'E2E fila', isActive: true,
  });
  const category = await api('POST', '/api/categories', {
    name: categoryName, type: 'EXPENSE', color: '#EF4444', icon: 'tag',
    description: 'E2E fila', isActive: true, position: 0,
  });
  expect(account.status, JSON.stringify(account.body)).toBe(201);
  expect(category.status, JSON.stringify(category.body)).toBe(201);
  accountId = account.body.data.id;
  categoryId = category.body.data.id;
});

test.afterAll(async () => {
  await ctx?.close();
});

test('duas transações idênticas com chaves distintas geram duas transações', async () => {
  const description = `Identica ${suffix}`;
  await seedQueue([
    { payload: queuePayload(description) },
    { payload: queuePayload(description) },
  ]);

  for (let index = 0; index < 2; index += 1) {
    await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
    await expect.poll(async () => (await readQueue()).length).toBe(1 - index);
  }
  expect(await countByDescription(description)).toBe(2);
});

test('resposta perdida: retry com a mesma chave não duplica e item interrompido volta a pending', async () => {
  const description = `RespostaPerdida ${suffix}`;
  const key = crypto.randomUUID();
  await seedQueue([{ payload: queuePayload(description), key }]);

  let aborted = false;
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() === 'POST' && !aborted) {
      aborted = true;
      await route.fetch(); // o servidor cria a transação…
      await route.abort('failed'); // …mas a resposta se perde.
      return;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect(page.getByText('Falha de conexão')).toBeVisible();
  const [kept] = await readQueue();
  expect(kept.idempotencyKey).toBe(key);
  expect(await countByDescription(description)).toBe(1);

  await page.unroute('**/api/transactions');
  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect.poll(async () => (await readQueue()).length).toBe(0);
  expect(await countByDescription(description)).toBe(1);
});

test('item em sending após reload volta para pending com a mesma chave', async () => {
  const key = crypto.randomUUID();
  await seedQueue([{ payload: queuePayload(`Sending ${suffix}`), key, status: 'sending' }]);
  await page.reload();
  await expect.poll(async () => (await readQueue())[0]?.status).toBe('pending');
  expect((await readQueue())[0].idempotencyKey).toBe(key);
  await expect(page.getByRole('button', { name: 'Sincronizar', exact: true }).first()).toBeVisible();
});

test('409 de idempotência oferece "Criar como novo"; 409 de negócio exige revisão', async () => {
  await seedQueue([
    { payload: queuePayload(`ConflitoIdem ${suffix}`) },
    { payload: queuePayload(`ConflitoNegocio ${suffix}`) },
  ]);
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON();
    const code = body.description.startsWith('ConflitoIdem')
      ? 'IDEMPOTENCY_PAYLOAD_CONFLICT'
      : 'CREDIT_CARD_STATEMENT_ALREADY_PAID';
    return route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code, message: 'conflito simulado' } }),
    });
  });

  const rows = page.locator('section[aria-label="Fila de sincronização"] > div > div');
  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Criar como novo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar como novo' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Descartar', exact: true }).first().click();

  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Revisar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar como novo' })).toHaveCount(0);
  void rows;
  await page.unroute('**/api/transactions');
});

test('conta desativada antes do retry leva a revisão sem criar a transação', async () => {
  const description = `ContaInativa ${suffix}`;
  const spare = await api('POST', '/api/accounts', {
    name: `Conta Inativa ${suffix}`, type: 'CREDIT_DEBIT', currency: 'BRL', color: '#22C55E', icon: 'wallet',
    description: 'E2E', isActive: true,
  });
  const payload = { ...queuePayload(description), accountId: spare.body.data.id };
  const update = await api('PUT', `/api/accounts/${spare.body.data.id}`, {
    name: spare.body.data.name, type: 'CREDIT_DEBIT', currency: 'BRL', color: '#22C55E', icon: 'wallet',
    description: 'E2E', isActive: false,
  });
  expect(update.status, JSON.stringify(update.body)).toBeLessThan(300);

  await seedQueue([{ payload }]);
  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Revisar', exact: true })).toBeVisible();
  expect(await countByDescription(description)).toBe(0);
  expect((await readQueue()).length).toBe(1);
});

test('storage indisponível: create online segue idempotente após resposta perdida', async () => {
  const description = `SemStorage ${suffix}`;
  await page.goto('/transacoes/nova');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__restoreSetItem = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('offline-transaction-queue')) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });

  const keys = [];
  let aborted = false;
  await page.route('**/api/transactions', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    if (!aborted) {
      aborted = true;
      await route.fetch();
      return route.abort('failed');
    }
    return route.continue();
  });

  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: categoryName, exact: true }).click();
  await page.getByLabel('Valor', { exact: true }).last().fill('4200');
  await page.getByLabel(/^Descrição\b/).last().fill(description);
  await page.getByRole('button', { name: 'Revisar e criar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
  await dialog.getByRole('button', { name: 'Criar transação', exact: true }).click();
  await expect.poll(() => keys.length).toBe(1);
  expect(keys[0]).toBeTruthy();

  await page.getByRole('button', { name: 'Revisar e criar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Criar transação', exact: true }).click();
  await expect(page).toHaveURL(/\/transacoes$/);
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(await countByDescription(description)).toBe(1);
  await page.unroute('**/api/transactions');
  await page.goto('/transacoes/nova'); // recarrega e remove o bloqueio de storage simulado
});

test('sessão expirada preserva o item e oferece "Entrar novamente"', async () => {
  const description = `Sessao ${suffix}`;
  const key = crypto.randomUUID();
  await seedQueue([{ payload: queuePayload(description), key }]);
  await page.route('**/api/transactions', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Não autenticado' } }),
        })
      : route.continue(),
  );

  await page.getByRole('button', { name: 'Sincronizar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Entrar novamente' })).toBeVisible();
  const [kept] = await readQueue();
  expect(kept).toMatchObject({ idempotencyKey: key, failureKind: 'auth' });
  expect(await countByDescription(description)).toBe(0);
  await page.unroute('**/api/transactions');
});

for (const [label, url, extra] of [
  ['recorrência', '/api/transactions/recurring/flexible', {
    recurrence: { frequency: 'MONTHLY', interval: 1, mode: 'count', occurrences: 3 },
  }],
  ['parcelamento', '/api/transactions/installments', { installmentCount: 3 }],
]) {
  test(`${label}: resposta perdida e retry com a mesma chave não cria segunda série`, async () => {
    const description = `Serie ${label} ${suffix}`;
    const now = new Date();
    const body = {
      transaction: {
        ...queuePayload(description),
        status: 'PENDING',
        month: ((now.getMonth() + 1) % 12) + 1,
        year: now.getFullYear() + (now.getMonth() + 1 >= 12 ? 1 : 0),
        day: 10,
      },
      ...extra,
    };
    const key = crypto.randomUUID();

    let aborted = false;
    await page.route(`**${url}`, async (route) => {
      if (!aborted) {
        aborted = true;
        await route.fetch(); // servidor cria a série, resposta se perde
        return route.abort('failed');
      }
      return route.continue();
    });

    const lost = await page
      .evaluate(
        async ({ u, b, k }) => {
          try {
            await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': k }, body: JSON.stringify(b) });
            return 'ok';
          } catch {
            return 'network';
          }
        },
        { u: url, b: body, k: key },
      );
    expect(lost).toBe('network');

    const retry = await api('POST', url, body, { 'Idempotency-Key': key });
    expect(retry.status, JSON.stringify(retry.body)).toBeLessThan(300);
    await page.unroute(`**${url}`);

    const other = await api('POST', url, { ...body, transaction: { ...body.transaction, amount: 9_999 } }, { 'Idempotency-Key': key });
    expect(other.body?.error?.code).toBe('IDEMPOTENCY_PAYLOAD_CONFLICT');

    expect(await countByDescription(description)).toBe(3);
  });
}

for (const width of [320, 360, 390]) {
  test(`fila legível em ${width}px sem overflow horizontal`, async () => {
    await page.setViewportSize({ width, height: 740 });
    await seedQueue([
      { payload: queuePayload(`Mobile ${width} ${suffix}`), status: 'error', failureKind: 'network', lastError: 'Falha de conexão' },
    ]);
    const panel = page.getByLabel('Fila de sincronização');
    await expect(panel).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    for (const button of await panel.getByRole('button').all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(36);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
