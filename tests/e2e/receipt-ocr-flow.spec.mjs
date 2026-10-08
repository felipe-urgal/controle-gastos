import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { setIsolatedClientIp } from './support/client-ip.mjs';

const password = 'Playwright123!';
const suffix = `${Date.now()}`;
const readerLabel = 'Ler recibo';

// Um único login para toda a suíte: o IP de CI tem limite de logins por janela.
test.describe.configure({ mode: 'serial' });
// OCR real (same-origin, sem CDN) em Chromium; o pipeline é idêntico nos demais navegadores.
test.setTimeout(120_000);

let page;
let ctx;
let accountName;
let categoryName;
const externalRequests = [];

async function createUser(email) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await prisma.user.create({
      data: {
        name: 'OCR E2E',
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

async function api(method, url, data) {
  return page.evaluate(
    async ({ method: m, url: u, data: d }) => {
      const response = await fetch(u, {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: d ? JSON.stringify(d) : undefined,
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { method, url, data },
  );
}

async function countTransactions() {
  const result = await api('GET', '/api/transactions?limit=100');
  const rows = result.body?.data?.transactions ?? result.body?.data?.items ?? result.body?.data ?? [];
  return rows.length;
}

/** Renders a synthetic receipt photo in the browser; no external fixture or network. */
async function receiptPng(lines, { rotate = false } = {}) {
  const dataUrl = await page.evaluate(({ lines: l, rotate: r }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 120 + l.length * 130;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    context.font = 'bold 72px monospace';
    l.forEach((line, index) => context.fillText(line, 40, 110 + index * 130));
    if (!r) return canvas.toDataURL('image/png');
    const rotated = document.createElement('canvas');
    rotated.width = canvas.height;
    rotated.height = canvas.width;
    const rotatedContext = rotated.getContext('2d');
    rotatedContext.translate(rotated.width, 0);
    rotatedContext.rotate(Math.PI / 2);
    rotatedContext.drawImage(canvas, 0, 0);
    return rotated.toDataURL('image/png');
  }, { lines, rotate });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

const RECEIPT = ['MERCADO BOM PRECO', 'EMISSAO 01/10/2026', 'TOTAL A PAGAR R$ 38,40'];

async function chooseFile(file) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: readerLabel }).click(),
  ]);
  await chooser.setFiles(file);
}

const visible = (locator) => locator.locator('visible=true');
const amountField = () => visible(page.getByLabel('Valor', { exact: true })).first();
const descriptionField = () => visible(page.getByLabel(/^Descrição\b/)).first();
const suggestions = () => visible(page.getByLabel('Sugestões do recibo', { exact: true })).first();

async function openForm() {
  await page.goto('/transacoes/nova');
  await expect(page.getByRole('button', { name: readerLabel })).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext({ serviceWorkers: 'block' });
  page = await ctx.newPage();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol.startsWith('http')) {
      externalRequests.push(request.url());
    }
  });
  await setIsolatedClientIp(page, suffix);
  const email = `ocr-${suffix}@example.test`;
  await createUser(email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  accountName = `Conta OCR ${suffix}`;
  categoryName = `Categoria OCR ${suffix}`;
  const account = await api('POST', '/api/accounts', {
    name: accountName, type: 'CREDIT_DEBIT', currency: 'BRL', color: '#22C55E', icon: 'wallet',
    description: 'E2E OCR', isActive: true,
  });
  const category = await api('POST', '/api/categories', {
    name: categoryName, type: 'EXPENSE', color: '#EF4444', icon: 'tag',
    description: 'E2E OCR', isActive: true, position: 0,
  });
  expect(account.status, JSON.stringify(account.body)).toBe(201);
  expect(category.status, JSON.stringify(category.body)).toBe(201);
});

test.afterAll(async () => {
  await ctx?.close();
});

test('imagem → sugestões → aplicar → revisar → criar, sem CDN e sem criação automática', async () => {
  await openForm();
  const before = await countTransactions();

  await chooseFile({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
  await expect(suggestions()).toBeVisible({ timeout: 90_000 });
  await expect(suggestions()).toBeFocused();
  await expect(suggestions()).toContainText('R$ 38,40');
  await expect(suggestions()).toContainText('01/10/2026');
  await expect(suggestions()).toContainText(/MERCADO/);

  // Nada é criado só por ler o recibo.
  expect(await countTransactions()).toBe(before);

  await visible(page.getByRole('button', { name: 'Aplicar selecionados' })).first().click();
  await expect(amountField()).toHaveValue(/38,40/);
  await expect(descriptionField()).toHaveValue(/MERCADO/);
  expect(await countTransactions()).toBe(before);

  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: categoryName, exact: true }).click();
  await visible(page.getByRole('button', { name: 'Revisar e criar', exact: true })).first().click();
  const dialog = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
  await dialog.getByRole('button', { name: 'Criar transação', exact: true }).click();
  await expect.poll(countTransactions).toBe(before + 1);

  // Todo o OCR rodou na própria origem.
  expect(externalRequests).toEqual([]);
});

test('campos já preenchidos são preservados por padrão e só mudam com marcação explícita', async () => {
  await openForm();
  await amountField().fill('99,99');
  await descriptionField().fill('Descrição manual');

  await chooseFile({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
  await expect(suggestions()).toBeVisible({ timeout: 90_000 });
  await expect(suggestions()).toContainText('Já preenchido — marque para substituir');
  await expect(suggestions().getByLabel('Aplicar valor')).not.toBeChecked();
  await expect(suggestions().getByLabel('Aplicar descrição')).not.toBeChecked();
  await expect(suggestions().getByLabel('Aplicar data')).toBeChecked();

  await visible(page.getByRole('button', { name: 'Aplicar selecionados' })).first().click();
  await expect(amountField()).toHaveValue(/99,99/);
  await expect(descriptionField()).toHaveValue('Descrição manual');

  // Substituição individual: só o valor.
  await chooseFile({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
  await expect(suggestions()).toBeVisible({ timeout: 90_000 });
  await suggestions().getByLabel('Aplicar valor').check();
  await suggestions().getByLabel('Aplicar data').uncheck();
  await visible(page.getByRole('button', { name: 'Aplicar selecionados' })).first().click();
  await expect(amountField()).toHaveValue(/38,40/);
  await expect(descriptionField()).toHaveValue('Descrição manual');
});

test('sugestão parcial: sem total reconhecível não sugere valor', async () => {
  await openForm();
  await chooseFile({
    name: 'sem-total.png',
    mimeType: 'image/png',
    buffer: await receiptPng(['MERCADO BOM PRECO', 'EMISSAO 01/10/2026', 'ARROZ 5KG 29,90', 'FEIJAO 1KG 8,50']),
  });
  await expect(suggestions()).toBeVisible({ timeout: 90_000 });
  await expect(suggestions().getByLabel('Aplicar valor')).toHaveCount(0);
  await expect(suggestions().getByLabel('Aplicar data')).toBeVisible();
});

test('erros claros e retry: arquivo renomeado, HEIC e vazio; depois imagem válida', async () => {
  await openForm();

  await chooseFile({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('isto não é uma imagem') });
  await expect(page.getByRole('alert').filter({ hasText: /corrompida/ })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /corrompida/ })).toBeFocused();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Tentar outra imagem' }).click(),
  ]);
  await chooser.setFiles({ name: 'foto.heic', mimeType: 'image/heic', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert').filter({ hasText: /HEIC e WebP/ })).toBeVisible();

  const [retry] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Tentar outra imagem' }).click(),
  ]);
  await retry.setFiles({ name: 'vazio.png', mimeType: 'image/png', buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert').filter({ hasText: /vazia/ })).toBeVisible();

  const [valid] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Tentar outra imagem' }).click(),
  ]);
  await valid.setFiles({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
  await expect(suggestions()).toBeVisible({ timeout: 90_000 });
});

test('cancelar não é erro e devolve o foco ao botão', async () => {
  await openForm();
  await chooseFile({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: readerLabel })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Tentar outra imagem' })).toHaveCount(0);
  await expect(suggestions()).toHaveCount(0);
});

test('foto rotacionada: lê ou falha graciosamente, sem criar nada', async () => {
  await openForm();
  const before = await countTransactions();
  await chooseFile({ name: 'girada.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT, { rotate: true }) });
  await expect(suggestions().or(page.getByRole('alert'))).toBeVisible({ timeout: 90_000 });
  expect(await countTransactions()).toBe(before);
});

for (const width of [320, 360, 390]) {
  test(`mobile ${width}px: sem overflow horizontal, alvos de 44px e texto reconhecido acessível`, async () => {
    await page.setViewportSize({ width, height: 800 });
    await openForm();

    const reader = page.getByRole('button', { name: readerLabel });
    expect((await reader.boundingBox()).height).toBeGreaterThanOrEqual(44);

    await chooseFile({ name: 'recibo.png', mimeType: 'image/png', buffer: await receiptPng(RECEIPT) });
    await expect(suggestions()).toBeVisible({ timeout: 90_000 });
    await suggestions().getByText('Ver texto reconhecido').click();

    for (const name of ['Descartar', 'Aplicar selecionados', 'Trocar imagem']) {
      const button = visible(page.getByRole('button', { name })).first();
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
