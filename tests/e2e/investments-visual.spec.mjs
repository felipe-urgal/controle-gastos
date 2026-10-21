import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { measure } from './support/layout-measure.mjs';
import { api, createAccount, startScenario } from './support/matrix.mjs';

// Inclui 640–900 px (tablet/landscape), onde grades de colunas fixas podiam estourar.
const WIDTHS = [320, 360, 390, 430, 640, 768, 900, 1024, 1280];
const MODAL_WIDTHS = [320, 360, 768, 1280];
const THEMES = ['light', 'dark'];
const AREAS = ['Carteira', 'Fiscal', 'Informes / IR'];
const SHOTS_DIR = process.env.SHOTS_DIR;

function isoDate(daysAgo = 0) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

async function seed(page, suffix) {
  const digits = suffix.replace(/\D/g, '').slice(-5);
  const brl = await createAccount(page, `Corretora BRL ${digits}`, 'BRL', 'INVESTMENT');
  const usd = await createAccount(page, `Corretora USD ${digits}`, 'USD', 'INVESTMENT');
  const brAsset = await api(page, 'POST', '/api/investments/assets', {
    symbol: `V${digits}3`,
    name: 'Ativo brasileiro com nome bem longo para testar quebra',
    type: 'STOCK',
    currency: 'BRL',
  });
  const usAsset = await api(page, 'POST', '/api/investments/assets', {
    symbol: `U${digits}`,
    name: 'Ativo no exterior',
    type: 'STOCK',
    currency: 'USD',
    taxLocation: 'ABROAD',
  });
  await api(page, 'POST', '/api/investments/operations', {
    type: 'BUY', accountId: brl.id, assetId: brAsset.id, quantity: '10', unitPriceCents: 123456, feesCents: 789, date: isoDate(30), note: null,
  });
  await api(page, 'POST', '/api/investments/operations', {
    type: 'BUY', accountId: usd.id, assetId: usAsset.id, quantity: '3', unitPriceCents: 25000, feesCents: 100, date: isoDate(20), note: null,
  });
}

function areaButton(page, name) {
  return page.getByRole('navigation', { name: 'Áreas de investimentos' }).getByRole('button', { name, exact: true });
}

test.describe('investimentos: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }, testInfo) => {
    test.setTimeout(900_000);
    const { suffix } = await startScenario(page, testInfo, 'inv-visual');
    await seed(page, suffix);

    const failures = [];
    async function check(where, width) {
      const result = await page.evaluate(measure, width <= 430);
      const h1 = await page.locator('h1:visible').count();
      if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
      if (h1 !== 1) failures.push(`${where}: ${h1} h1 visíveis`);
      for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
      for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
      for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);
      if (SHOTS_DIR) {
        mkdirSync(SHOTS_DIR, { recursive: true });
        const name = where.replace(/[^\w@=-]+/g, '_');
        await page.screenshot({ path: `${SHOTS_DIR}/inv-${name}.png`, fullPage: true });
      }
    }

    for (const showValues of [true, false]) {
      await api(page, 'PATCH', '/api/user', { showValues });
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto('/investimentos');
          await expect(page.getByRole('heading', { name: 'Investimentos', exact: true })).toBeVisible();
          await page.evaluate((value) => {
            try { window.localStorage.setItem('theme', value); } catch {}
            document.documentElement.setAttribute('data-theme', value);
          }, theme);

          for (const area of AREAS) {
            await areaButton(page, area).click();
            await page.waitForLoadState('networkidle').catch(() => {});
            // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
            await page.waitForTimeout(350);
            await check(`${area} @${width} ${theme} showValues=${showValues}`, width);
          }

          if (showValues && MODAL_WIDTHS.includes(width)) {
            await areaButton(page, 'Carteira').click();
            for (const name of ['Novo ativo', 'Nova operação', 'Importar']) {
              const trigger = page.getByRole('button', { name, exact: true });
              await expect(trigger).toBeEnabled();
              await trigger.click();
              await expect(page.getByRole('dialog').first()).toBeVisible();
              await page.waitForTimeout(350);
              await check(`modal ${name} @${width} ${theme}`, width);
              await page.keyboard.press('Escape');
              await expect(page.getByRole('dialog')).toHaveCount(0);
            }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
