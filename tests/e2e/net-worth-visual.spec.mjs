import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { measure } from './support/layout-measure.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
// Inclui 640–900 px (tablet/landscape), onde as grades de colunas fixas do dashboard podiam estourar.
const WIDTHS = [320, 360, 390, 430, 640, 768, 900, 1024, 1280];
const THEMES = ['light', 'dark'];
const SHOTS_DIR = process.env.SHOTS_DIR;

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function api(page, method, url, data) {
  return page.evaluate(
    async ({ method: verb, url: target, data: body }) => {
      const response = await fetch(target, {
        method: verb,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(`${target}: ${response.status} ${JSON.stringify(json)}`);
      return json.data;
    },
    { method, url, data },
  );
}

test.describe('patrimônio: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-nw-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright NW Visual', email, password });
    await login(page, email);

    const make = (name, currency, type = 'CREDIT_DEBIT') =>
      api(page, 'POST', '/api/accounts', {
        name,
        type,
        currency,
        color: '#22C55E',
        icon: type === 'INVESTMENT' ? 'chart-line' : 'wallet',
        description: 'Conta de validação visual',
        isActive: true,
      });
    const brl = await make('Conta Corrente Principal com Nome Longo', 'BRL');
    const usd = await make('Conta em Dólar', 'USD');
    const investment = await make('Investimento Renda Fixa', 'BRL', 'INVESTMENT');
    const income = await api(page, 'POST', '/api/categories', {
      name: 'Salário',
      type: 'INCOME',
      color: '#10B981',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 0,
    });
    const now = new Date();
    for (const [index, [account, amount]] of [[brl, 1234567], [usd, 100000], [investment, 500000]].entries()) {
      await api(page, 'POST', '/api/transactions', {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        day: 1 + index,
        type: 'INCOME',
        status: 'COMPLETED',
        amount,
        description: `Patrimônio ${account.name}`,
        accountId: account.id,
        categoryId: income.id,
      });
    }

    const failures = [];
    for (const showValues of [true, false]) {
      await api(page, 'PATCH', '/api/user', { showValues });
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto('/patrimonio');
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.evaluate((value) => {
            try { window.localStorage.setItem('theme', value); } catch {}
            document.documentElement.setAttribute('data-theme', value);
          }, theme);
          // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
          await page.waitForTimeout(400);

          const result = await page.evaluate(measure, width <= 430);
          const visibleH1 = await page.locator('h1:visible').count();
          const where = `/patrimonio @${width} ${theme} showValues=${showValues}`;
          if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
          if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
          for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
          for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
          for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

          if (SHOTS_DIR) {
            mkdirSync(SHOTS_DIR, { recursive: true });
            await page.screenshot({ path: `${SHOTS_DIR}/patrimonio-${width}-${theme}-${showValues ? 'on' : 'off'}.png`, fullPage: true });
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
