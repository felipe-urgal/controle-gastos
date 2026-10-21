import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('transações no mobile (360×640)', () => {
  test.skip(({ browserName }) => !['chromium', 'webkit'].includes(browserName), 'roda em chromium e webkit');

  test('filtros acessíveis sem filtro ativo e CTA do formulário sempre visível acima da navegação', async ({ page }) => {
    test.setTimeout(90_000);
    const email = `playwright-tx-mobile-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Tx Mobile', email, password });
    await login(page, email);
    await page.setViewportSize({ width: 360, height: 640 });

    // Filtros: o botão existe mesmo com 0 filtros e abre um sheet de tela cheia com ações visíveis.
    await page.goto('/transacoes');
    await page.getByRole('button', { name: /^Filtros\b/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
    await expect(dialog).toBeVisible();
    const apply = dialog.getByRole('button', { name: 'Aplicar filtros', exact: true });
    await expect(apply).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Formulário: o botão de avanço fica visível sem rolar e não é coberto pela bottom-nav.
    await page.goto('/transacoes/nova');
    const next = page.getByRole('button', { name: /^Continuar/ }).first();
    await expect(next).toBeVisible();
    await expect(next).toBeInViewport({ ratio: 1 });
    const geometry = await next.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const nav = document.querySelector('nav[aria-label="Navegação principal"]')?.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        bottom: rect.bottom,
        navTop: nav?.top ?? window.innerHeight,
        height: rect.height,
        topmost: hit === element || element.contains(hit),
      };
    });
    expect(geometry.topmost).toBeTruthy();
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.navTop + 1);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
  });
  test('importação a 360×640: lista empilhada, filtros roláveis, revisão em sheet e CTA visível', async ({ page }) => {
    test.setTimeout(90_000);
    const email = `playwright-import-mobile-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Import Mobile', email, password });
    await login(page, email);
    await page.setViewportSize({ width: 360, height: 640 });

    const accountId = await page.evaluate(async () => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Conta importação mobile',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          color: '#22C55E',
          icon: 'wallet',
          description: 'Conta isolada do E2E de importação mobile',
          isActive: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`/api/accounts ${response.status}: ${JSON.stringify(body)}`);
      return body.data.id;
    });

    await page.goto('/transacoes/importar');
    await page.getByRole('combobox').first().selectOption(accountId);
    await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
      name: 'mobile.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('data;descricao;valor\n2026-09-09;Mercado mobile;-42.50\n2026-09-10;Padaria mobile;-12.00'),
    });
    await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'mobile.csv', exact: true })).toBeVisible();

    const noHorizontalScroll = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await noHorizontalScroll()).toBe(true);

    // Filtros em faixa rolável com alvos de 44px.
    const filter = page.getByRole('navigation', { name: 'Filtrar itens da importação' }).getByRole('button').first();
    expect((await filter.boundingBox()).height).toBeGreaterThanOrEqual(44);

    // Revisão abre em sheet de tela cheia a partir da lista empilhada.
    await page.getByRole('button', { name: /Mercado mobile/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Revisar lançamento', exact: true });
    await expect(dialog).toBeVisible();
    expect(await noHorizontalScroll()).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // CTA de confirmação sticky, visível sem rolar até o fim e acima da navegação.
    const confirm = page.getByRole('button', { name: /^Confirmar/ }).first();
    await expect(confirm).toBeInViewport({ ratio: 1 });
  });
});
