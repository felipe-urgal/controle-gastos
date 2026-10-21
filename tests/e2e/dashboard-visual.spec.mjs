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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(`${target}: ${response.status} ${JSON.stringify(json)}`);
      return json.data;
    },
    { method, url, data },
  );
}

test.describe('dashboard: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-dash-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Dash Visual', email, password });
    await login(page, email);

    const account = await api(page, 'POST', '/api/accounts', {
      name: 'Conta Corrente Principal com Nome Longo',
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#22C55E',
      icon: 'wallet',
      description: 'Conta de validação visual',
      isActive: true,
    });
    const expense = await api(page, 'POST', '/api/categories', {
      name: 'Alimentação e Supermercado',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 0,
    });
    const income = await api(page, 'POST', '/api/categories', {
      name: 'Salário',
      type: 'INCOME',
      color: '#10B981',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 1,
    });
    const now = new Date();
    const base = { year: now.getFullYear(), month: now.getMonth() + 1, accountId: account.id, status: 'COMPLETED' };
    await api(page, 'POST', '/api/transactions', { ...base, day: 1, type: 'INCOME', amount: 850000, description: 'Salário mensal da empresa', categoryId: income.id });
    for (const [index, [description, amount]] of [
      ['Supermercado do bairro com descrição bem longa para testar quebra de linha', 34567],
      ['Padaria', 1890],
      ['Restaurante japonês', 18900],
    ].entries()) {
      await api(page, 'POST', '/api/transactions', { ...base, day: index + 2, type: 'EXPENSE', amount, description, categoryId: expense.id });
    }

    const failures = [];
    for (const showValues of [true, false]) {
      await api(page, 'PATCH', '/api/user', { showValues });
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.evaluate((value) => {
            try { window.localStorage.setItem('theme', value); } catch {}
            document.documentElement.setAttribute('data-theme', value);
          }, theme);
          // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
          await page.waitForTimeout(400);

          const result = await page.evaluate(measure, width <= 430);
          const visibleH1 = await page.locator('h1:visible').count();
          const where = `/dashboard @${width} ${theme} showValues=${showValues}`;
          if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
          if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
          for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
          for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
          for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

          if (SHOTS_DIR) {
            mkdirSync(SHOTS_DIR, { recursive: true });
            await page.screenshot({ path: `${SHOTS_DIR}/dashboard-${width}-${theme}-${showValues ? 'on' : 'off'}.png`, fullPage: true });
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
