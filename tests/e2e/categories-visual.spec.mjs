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

test.describe('categorias: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-cat-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Cat Visual', email, password });
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
    const now = new Date();
    const names = [
      'Alimentação e Supermercado com Nome Longo',
      'Transporte',
      'Moradia e Condomínio',
      'Saúde',
    ];
    const categories = [];
    for (const [position, name] of names.entries()) {
      categories.push(
        await api(page, 'POST', '/api/categories', {
          name,
          type: 'EXPENSE',
          color: ['#EF4444', '#F97316', '#3B82F6', '#A855F7'][position],
          icon: 'tag',
          description: 'Categoria de validação visual',
          isActive: true,
          position,
        }),
      );
    }
    await api(page, 'POST', '/api/categories', {
      name: 'Salário',
      type: 'INCOME',
      color: '#10B981',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 10,
    });
    for (const [index, category] of categories.entries()) {
      await api(page, 'POST', '/api/transactions', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: index + 1,
        accountId: account.id,
        categoryId: category.id,
        status: 'COMPLETED',
        type: 'EXPENSE',
        amount: 34567 + index * 20000,
        description: `Gasto ${index + 1}`,
      });
      await api(page, 'PUT', '/api/category-limits', {
        categoryId: category.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        currency: 'BRL',
        amount: index === 1 ? 50000 : 120000,
      });
    }
    const firstId = categories[0].id;
    const routes = ['/categorias', '/categorias/nova', `/categorias/show/${firstId}`, `/categorias/alterar/${firstId}`];

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
            const where = `${route.replace(firstId, '[id]')} @${width} ${theme} showValues=${showValues}`;
            if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
            if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
            for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
            for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
            for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

            if (SHOTS_DIR) {
              mkdirSync(SHOTS_DIR, { recursive: true });
              const name = route.replace(firstId, 'id').replace(/\//g, '_');
              await page.screenshot({ path: `${SHOTS_DIR}/cat${name}-${width}-${theme}-${showValues ? 'on' : 'off'}.png`, fullPage: true });
            }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
