import { expect, test } from '@playwright/test';
import { horizontalOverflow } from './support/layout.mjs';
import { createVerifiedUser, seedBulkTransactions } from './support/verified-user.mjs';

/**
 * Smoke de layout com dados: usuário com conta de nome longo, categoria e 80 transações
 * (uma com descrição longa) e as rotas dinâmicas `[id]`. Falha em rolagem horizontal,
 * em mais de um <h1> visível e em campos com fonte < 16px em telas estreitas.
 */
const password = 'Playwright123!';
const VIEWPORTS = [320, 360, 390, 430, 768, 1280].map((width) => ({ width, height: width < 768 ? 780 : 900 }));

test.describe('layout com dados', () => {
  test.skip(({ browserName }) => !['chromium', 'webkit'].includes(browserName), 'smoke de layout roda em chromium e webkit');

  test('listas volumosas e rotas [id] sem estouro horizontal', async ({ page }) => {
    test.setTimeout(300_000);
    const email = `playwright-layout-data-${Date.now()}-${test.info().retry}@example.test`;
    const user = await createVerifiedUser({ name: 'Playwright Layout Dados', email, password });
    const { accountId, categoryId, transactionId } = await seedBulkTransactions({ userId: user.id, count: 80 });

    await page.goto('/login');
    await page.getByLabel(/^E-mail\b/).fill(email);
    await page.getByLabel(/^Senha\b/).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const routes = [
      '/dashboard',
      '/transacoes',
      '/contas',
      '/categorias',
      '/calendario',
      '/patrimonio',
      `/transacoes/show/${transactionId}`,
      `/transacoes/alterar/${transactionId}`,
      `/contas/show/${accountId}`,
      `/contas/alterar/${accountId}`,
      `/categorias/show/${categoryId}`,
      `/categorias/alterar/${categoryId}`,
    ];

    const problems = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        const { overflow, tag } = await page.evaluate(horizontalOverflow);
        if (overflow > 1) problems.push(`${route.replace(/[0-9a-f-]{36}/, ':id')} @${viewport.width}: +${overflow}px ${tag}`);

        const result = await page.evaluate(() => {
          const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          return {
            h1: [...document.querySelectorAll('h1')].filter(visible).length,
            smallFont: [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]), select, textarea')]
              .filter(visible)
              .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
              .map((element) => `${element.tagName.toLowerCase()}[${element.getAttribute('name') ?? element.getAttribute('type') ?? element.getAttribute('aria-label') ?? ''}]`),
          };
        });
        const label = route.replace(/[0-9a-f-]{36}/, ':id');
        if (result.h1 > 1) problems.push(`${label} @${viewport.width}: ${result.h1} h1 visíveis`);
        if (viewport.width < 768 && result.smallFont.length > 0) problems.push(`${label} @${viewport.width}: fonte <16px ${JSON.stringify(result.smallFont.slice(0, 4))}`);
      }
    }

    console.log('[layout-data]', JSON.stringify(problems));
    expect(problems).toEqual([]);
  });
});
