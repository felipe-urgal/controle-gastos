import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { measure } from './support/layout-measure.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const WIDTHS = [320, 360, 390, 430, 640, 768, 900, 1024, 1280];
const THEMES = ['light', 'dark'];
const ROUTES = ['/calendario', '/recorrencias', '/modelos', '/tags', '/estabelecimentos'];
const SHOTS_DIR = process.env.SHOTS_DIR;
const LONG = 'Nome extremamente longo sem nenhum espaço para testar quebra e truncamento';

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

function monthAt(offset, day = 10) {
  const date = new Date(new Date().getFullYear(), new Date().getMonth() + offset, day);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day };
}

test.describe('gestão auxiliar: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(900_000);
    const email = `playwright-aux-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Aux Visual', email, password });
    await login(page, email);

    const account = await api(page, 'POST', '/api/accounts', {
      name: 'Conta Corrente Principal',
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#22C55E',
      icon: 'wallet',
      description: 'Conta de validação visual',
      isActive: true,
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

    // Calendário: vários eventos no mês (receita, despesas e pendente) em dias distintos.
    const now = new Date();
    const base = { year: now.getFullYear(), month: now.getMonth() + 1, accountId: account.id, categoryId: category.id };
    for (const [day, amount, status] of [[2, 34567, 'COMPLETED'], [2, 1890, 'COMPLETED'], [5, 18900, 'PENDING'], [9, 7650, 'COMPLETED']]) {
      await api(page, 'POST', '/api/transactions', { ...base, day, type: 'EXPENSE', amount, status, description: `Compra ${day}` });
    }

    // Recorrências: candidato mensal com nome longo.
    for (const [index, amount] of [10000, 10100, 9900].entries()) {
      await api(page, 'POST', '/api/transactions', {
        accountId: account.id,
        categoryId: category.id,
        amount,
        description: `Assinatura ${LONG}`,
        ...monthAt(index - 3),
        status: 'COMPLETED',
        type: 'EXPENSE',
      });
    }

    // Tags, estabelecimentos e modelos com nomes longos.
    for (const name of ['ferias-2026', 'tag-com-nome-longo-sem-espacos-x1']) {
      await api(page, 'POST', '/api/tags', { name });
    }
    for (const name of [`Estabelecimento ${LONG}`.slice(0, 120), 'iFood']) {
      await api(page, 'POST', '/api/merchants', { name });
    }
    await api(page, 'POST', '/api/transaction-templates', {
      name: `Modelo ${LONG}`.slice(0, 80),
      type: 'EXPENSE',
      description: `Descrição ${LONG}`,
      amount: 12345,
      accountId: account.id,
      categoryId: category.id,
      isFavorite: true,
    });

    const failures = [];
    for (const showValues of [true, false]) {
      await api(page, 'PATCH', '/api/user', { showValues });
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          for (const route of ROUTES) {
            await page.goto(route);
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.evaluate((value) => {
              try { window.localStorage.setItem('theme', value); } catch {}
              document.documentElement.setAttribute('data-theme', value);
            }, theme);
            // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
            await page.waitForTimeout(400);

            const result = await page.evaluate(measure, width <= 430);
            // O shell esconde o overflow do <html>; mede também o conteúdo clipado em #main-content.
            const mainOverflow = await page.evaluate(() => {
              const main = document.getElementById('main-content');
              return main ? main.scrollWidth - main.clientWidth : 0;
            });
            result.overflow = Math.max(result.overflow, mainOverflow);
            const visibleH1 = await page.locator('h1:visible').count();
            const where = `${route} @${width} ${theme} showValues=${showValues}`;
            if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
            if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
            for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
            for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
            for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

            if (SHOTS_DIR) {
              mkdirSync(SHOTS_DIR, { recursive: true });
              await page.screenshot({ path: `${SHOTS_DIR}/aux${route.replace(/\//g, '_')}-${width}-${theme}-${showValues ? 'on' : 'off'}.png` });
            }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
