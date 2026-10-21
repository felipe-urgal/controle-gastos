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

test.describe('contas e cartão: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('rotas de contas e cartão: sem overflow, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-accounts-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Accounts Visual', email, password });
    await login(page, email);

    const mk = (name, extra) =>
      api(page, 'POST', '/api/accounts', {
        name,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        color: '#22C55E',
        icon: 'wallet',
        description: 'Conta de validação visual',
        isActive: true,
        ...extra,
      });
    const bank = await mk('Conta Corrente Principal com Nome Longo');
    await mk('Poupança em Euro', { currency: 'EUR', color: '#3B82F6' });
    await mk('Corretora', { type: 'INVESTMENT', color: '#F59E0B', icon: 'chart-line' });
    const card = await mk('Cartão Platinum Internacional Black', {
      type: 'CREDIT_CARD',
      color: '#7C3AED',
      icon: 'credit-card',
      description: null,
      creditLimit: 50000000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });
    const category = await api(page, 'POST', '/api/categories', {
      name: 'Alimentação e Supermercado',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 0,
    });
    const now = new Date();
    for (const [index, accountId] of [bank.id, card.id].entries()) {
      await api(page, 'POST', '/api/transactions', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: index + 1,
        accountId,
        categoryId: category.id,
        status: 'COMPLETED',
        type: 'EXPENSE',
        amount: 1234567,
        description: 'Supermercado do bairro com descrição bem longa para testar quebra de linha',
      });
    }

    const routes = [
      '/contas',
      '/contas/nova',
      `/contas/show/${bank.id}`,
      `/contas/alterar/${bank.id}`,
      `/contas/show/${card.id}`,
    ];

    const failures = [];
    for (const showValues of [true, false]) {
      await api(page, 'PATCH', '/api/user', { showValues });
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          for (const route of routes) {
          await page.goto(route);
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.evaluate((value) => {
            try { window.localStorage.setItem('theme', value); } catch {}
            document.documentElement.setAttribute('data-theme', value);
          }, theme);
          // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
          await page.waitForTimeout(400);

          const result = await page.evaluate(measure, width <= 430);
          const visibleH1 = await page.locator('h1:visible').count();
          const where = `${route.replace(/[0-9a-f-]{36}/, '[id]')} @${width} ${theme} showValues=${showValues}`;
          if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
          if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
          for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
          for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
          for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

          if (SHOTS_DIR) {
            mkdirSync(SHOTS_DIR, { recursive: true });
            await page.screenshot({ path: `${SHOTS_DIR}/${route.replace(/[0-9a-f-]{36}/, 'id').replace(/\//g, '_')}-${width}-${theme}-${showValues ? 'on' : 'off'}.png`, fullPage: true });
          }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
