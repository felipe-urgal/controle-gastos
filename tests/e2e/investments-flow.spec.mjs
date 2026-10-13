import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  api,
  createAccount,
  expectMasked,
  expectNoMoneyLeak,
  forEachWidth,
  startScenario,
} from './support/matrix.mjs';

const FISCAL_ENDPOINTS =
  /\/api\/investments\/(fiscal-pendencies|annual-tax-support|income-report|realized-results|tax-losses|taxes|fiscal-snapshots|annual-statements|fiscal-cost-adjustments)/;

function areaButton(page, name) {
  return page
    .getByRole('navigation', { name: 'Áreas de investimentos' })
    .getByRole('button', { name, exact: true });
}

function isoDate(daysAgo = 0) {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function seedPortfolio(page, suffix) {
  const account = await createAccount(page, `Corretora ${suffix}`, 'BRL', 'INVESTMENT');
  const asset = await api(page, 'POST', '/api/investments/assets', {
    symbol: `E${suffix.replace(/\D/g, '').slice(-6)}3`,
    name: 'Ativo E2E',
    type: 'STOCK',
    currency: 'BRL',
  });
  await api(page, 'POST', '/api/investments/operations', {
    type: 'BUY',
    accountId: account.id,
    assetId: asset.id,
    quantity: '10',
    unitPriceCents: 123456,
    feesCents: 789,
    date: isoDate(30),
    note: null,
  });
  return { account, asset };
}

test('investimentos: acesso sem sessão é redirecionado ao login', async ({ page }) => {
  await page.goto('/investimentos');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  const response = await page.request.get('/api/investments');
  expect(response.status()).toBe(401);
});

test('investimentos: ativo → compra → posição → venda pela interface', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-flow');
  const account = await createAccount(page, `Corretora fluxo ${suffix}`, 'BRL', 'INVESTMENT');
  const symbol = `F${suffix.replace(/\D/g, '').slice(-6)}3`;

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/investimentos');
  await expect(page.getByRole('heading', { name: 'Investimentos', exact: true })).toBeVisible();

  // Ativo
  await page.getByRole('button', { name: 'Novo ativo', exact: true }).click();
  const assetDialog = page.getByRole('dialog').first();
  await expect(assetDialog).toBeVisible();
  await assetDialog.getByRole('textbox', { name: /^Código/ }).fill(symbol);
  await assetDialog.getByRole('button', { name: 'Criar ativo', exact: true }).click();
  await expect(assetDialog).toBeHidden();

  // Compra
  const newOperation = page.getByRole('button', { name: 'Nova operação', exact: true });
  await expect(newOperation).toBeEnabled();
  await newOperation.click();
  const buyDialog = page.getByRole('dialog').first();
  await expect(buyDialog).toBeVisible();
  // Selects: Operação, Conta, Ativo.
  await buyDialog.locator('select').nth(1).selectOption({ index: 1 });
  await buyDialog.locator('select').nth(2).selectOption({ index: 1 });
  await buyDialog.getByRole('textbox', { name: /^Quantidade/ }).fill('10');
  await buyDialog.getByRole('textbox', { name: /^Preço unitário/ }).fill('25,00');
  await buyDialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(buyDialog).toBeHidden();
  await expect(page.getByText(symbol).first()).toBeVisible();

  // Posição derivada das operações
  const positions = await page.evaluate(async () => {
    const response = await fetch('/api/investments');
    return (await response.json()).data;
  });
  expect(positions.positions.find((item) => item.symbol === symbol).quantity).toBe('10');

  // Venda parcial
  await newOperation.click();
  const sellDialog = page.getByRole('dialog').first();
  await expect(sellDialog).toBeVisible();
  await sellDialog.locator('select').nth(0).selectOption('SELL');
  await sellDialog.locator('select').nth(1).selectOption({ index: 1 });
  await sellDialog.locator('select').nth(2).selectOption({ index: 1 });
  await sellDialog.getByRole('textbox', { name: /^Quantidade/ }).fill('4');
  await sellDialog.getByRole('textbox', { name: /^Preço unitário/ }).fill('30,00');
  await sellDialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(sellDialog).toBeHidden();

  const after = await page.evaluate(async () => {
    const response = await fetch('/api/investments');
    return (await response.json()).data;
  });
  expect(after.positions.find((item) => item.symbol === symbol).quantity).toBe('6');
  expect(account.id).toBeTruthy();
});

test('investimentos: importação CSV com prévia e confirmação', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-import');
  await createAccount(page, `Corretora import ${suffix}`, 'BRL', 'INVESTMENT');
  const code = `I${suffix.replace(/\D/g, '').slice(-5)}11`;
  const csv = [
    'Entrada/Saída,Data,Movimentação,Produto,Instituição,Quantidade,Preço unitário,Valor da Operação',
    `Credito,09/12/2024,Transferência - Liquidação,"${code} - FUNDO E2E - FII",Nubank Investimentos,137,"9,124","1.249,99"`,
  ].join('\n');
  mkdirSync(testInfo.outputDir, { recursive: true });
  const file = join(testInfo.outputDir, 'import.csv');
  writeFileSync(file, csv, 'utf8');

  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/investimentos');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Importar investimentos' });
  await expect(dialog).toBeVisible();
  await dialog.locator('select').selectOption({ index: 1 });
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByRole('button', { name: 'Analisar arquivo', exact: true }).click();
  await expect(dialog.getByText('Novos', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: /^Importar \d+ registro/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(code).first()).toBeVisible();

  // Reimportar o mesmo arquivo é idempotente (duplicado ignorado).
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await dialog.locator('select').selectOption({ index: 1 });
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByRole('button', { name: 'Analisar arquivo', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /^Importar 0 registro/ })).toBeDisabled();
});

test('investimentos: fluxo fiscal essencial é carregado sob demanda', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-fiscal');
  await seedPortfolio(page, suffix);

  const fiscalRequests = [];
  page.on('request', (request) => {
    if (FISCAL_ENDPOINTS.test(request.url())) fiscalRequests.push(request.url());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/investimentos');
  await expect(page.getByRole('heading', { name: 'Investimentos', exact: true })).toBeVisible();
  await expect(areaButton(page, 'Carteira')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForLoadState('networkidle');
  // Abrir a carteira não carrega superfícies fiscais.
  expect(fiscalRequests).toEqual([]);

  await areaButton(page, 'Fiscal').click();
  await expect.poll(() => fiscalRequests.length).toBeGreaterThan(0);
  await expect(areaButton(page, 'Fiscal')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // Superfícies fiscais essenciais renderizadas após abrir a área.
  for (const heading of ['Pendências fiscais', 'IRRF e DARF']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});

test('investimentos: histórico grande é paginado sem payload completo', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-history');
  const { account, asset } = await seedPortfolio(page, suffix);

  // 119 compras adicionais (total 120), sequenciais para preservar a ordem.
  await page.evaluate(
    async ({ accountId, assetId }) => {
      for (let index = 0; index < 119; index += 1) {
        const date = new Date(Date.now() - (index + 31) * 86_400_000);
        const response = await fetch('/api/investments/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            type: 'BUY',
            accountId,
            assetId,
            quantity: '1',
            unitPriceCents: 1000,
            feesCents: 0,
            date: date.toISOString().slice(0, 10),
            note: null,
          }),
        });
        if (!response.ok) {
          throw new Error(`op ${index} failed ${response.status} ${await response.text()}`);
        }
      }
    },
    { accountId: account.id, assetId: asset.id },
  );

  const payloads = await page.evaluate(async (assetId) => {
    const portfolio = await (await fetch('/api/investments')).json();
    const history = await (
      await fetch(`/api/investments/operations?assetId=${assetId}&page=1&limit=100`)
    ).json();
    const second = await (
      await fetch(`/api/investments/operations?assetId=${assetId}&page=2&limit=100`)
    ).json();
    return {
      recent: portfolio.data.operations?.length ?? 0,
      firstPage: history.data.items.length,
      total: history.data.total ?? history.data.pagination?.total,
      secondPage: second.data.items.length,
    };
  }, asset.id);

  expect(payloads.recent).toBeLessThanOrEqual(30);
  expect(payloads.firstPage).toBe(100);
  expect(payloads.secondPage).toBe(20);
  expect(payloads.total).toBe(120);
});

test('investimentos: sem overflow em 320/360/390/1280', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-widths');
  await seedPortfolio(page, suffix);

  await forEachWidth(page, async () => {
    await page.goto('/investimentos');
    await expect(page.getByRole('heading', { name: 'Investimentos', exact: true })).toBeVisible();
    await expect(areaButton(page, 'Carteira')).toBeVisible();
  });

  for (const area of ['Fiscal', 'Informes / IR']) {
    await forEachWidth(page, async () => {
      await page.goto('/investimentos');
      await areaButton(page, area).click();
      await expect(areaButton(page, area)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.waitForLoadState('networkidle');
    });
  }
});

test('investimentos: showValues=false não vaza valores', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const { suffix } = await startScenario(page, testInfo, 'inv-privacy', { showValues: false });
  await seedPortfolio(page, suffix);

  await forEachWidth(page, async () => {
    await page.goto('/investimentos');
    await expect(areaButton(page, 'Carteira')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectMasked(page);
    await expectNoMoneyLeak(page);
  });

  await page.setViewportSize({ width: 360, height: 780 });
  for (const area of ['Fiscal', 'Informes / IR']) {
    await page.goto('/investimentos');
    await areaButton(page, area).click();
    await page.waitForLoadState('networkidle');
    await expectNoMoneyLeak(page);
  }
});
