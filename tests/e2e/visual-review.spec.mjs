import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

/**
 * Captura de telas para revisão visual (360px, tema claro e escuro, com dados semeados).
 * Só roda com `VISUAL_REVIEW=1`; as imagens vão para `SHOTS_DIR` (padrão /tmp/shots) e não
 * são versionadas.
 *
 *   VISUAL_REVIEW=1 SHOT_WIDTHS=320,360 SHOTS_DIR=/tmp/shots pnpm test:e2e visual-review --project=chromium
 */
const OUT = process.env.SHOTS_DIR ?? '/tmp/shots';
const ROUTES = [
  ['dashboard', '/dashboard'],
  ['transacoes', '/transacoes'],
  ['transacoes-nova', '/transacoes/nova'],
  ['contas', '/contas'],
  ['categorias', '/categorias'],
  ['investimentos', '/investimentos'],
  ['patrimonio', '/patrimonio'],
  ['dividas', '/dividas'],
  ['metas', '/metas'],
  ['calendario', '/calendario'],
  ['recorrencias', '/recorrencias'],
  ['tags', '/tags'],
  ['modelos', '/modelos'],
  ['usuario', '/usuario'],
];

test('capturas', async ({ page }) => {
  test.skip(!process.env.VISUAL_REVIEW, 'defina VISUAL_REVIEW=1 para gerar as capturas');
  test.setTimeout(600_000);
  mkdirSync(OUT, { recursive: true });
  const email = `shots-${Date.now()}@example.test`;
  await createVerifiedUser({ name: 'Maria Silva', email, password: 'Playwright123!' });
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill('Playwright123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/dashboard/);

  await page.evaluate(async () => {
    const post = async (url, data) => {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) throw new Error(`${url}: ${response.status} ${JSON.stringify(body)}`);
      return body.data;
    };
    const checking = await post('/api/accounts', { name: 'Conta Corrente Principal com Nome Longo', type: 'CREDIT_DEBIT', currency: 'BRL', color: '#22C55E', icon: 'wallet', description: 'Conta do dia a dia', isActive: true });
    await post('/api/accounts', { name: 'Reserva', type: 'CREDIT_DEBIT', currency: 'BRL', color: '#3B82F6', icon: 'wallet', description: '', isActive: true });
    const food = await post('/api/categories', { name: 'Alimentação e Supermercado', type: 'EXPENSE', color: '#EF4444', icon: 'tag', description: '', isActive: true, position: 0 });
    const salary = await post('/api/categories', { name: 'Salário', type: 'INCOME', color: '#10B981', icon: 'tag', description: '', isActive: true, position: 1 });
    const now = new Date();
    const base = { year: now.getFullYear(), month: now.getMonth() + 1, accountId: checking.id, status: 'COMPLETED' };
    await post('/api/transactions', { ...base, day: 1, amount: 850000, description: 'Salário mensal da empresa', categoryId: salary.id, type: 'INCOME' });
    for (const [i, [d, a]] of [['Supermercado do bairro com descrição bem longa para testar quebra', 34567], ['Padaria', 1890], ['Restaurante japonês', 18900], ['Feira', 7650]].entries()) {
      await post('/api/transactions', { ...base, day: Math.min(i + 2, 28), amount: a, description: d, categoryId: food.id, type: 'EXPENSE' });
    }
  });

  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { try { localStorage.setItem('theme', value); document.documentElement.setAttribute('data-theme', value); } catch {} }, theme);
    for (const width of (process.env.SHOT_WIDTHS ?? '360').split(',').map(Number)) {
      await page.setViewportSize({ width, height: 780 });
      for (const [name, route] of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${name}-${theme}-${width}.png`, fullPage: false });
      }
    }
  }
});
