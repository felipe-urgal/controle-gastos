import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

test('busca global: teclado, trap, Escape e viewport mobile', async ({ page, request }) => {
  test.setTimeout(90_000);
  const email = `qa-search-a11y-${Date.now()}@example.test`;
  await createVerifiedUser({ name: 'QA Busca Acessível', email, password });
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 680 });
    const openButton = page.getByRole('button', { name: 'Abrir busca global', exact: true });
    await openButton.click();
    const dialog = page.getByRole('dialog', { name: 'Busca global' });
    await expect(dialog).toBeVisible();
    const input = dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
    await expect(input).toBeFocused();
    const fits = await dialog.evaluate((node) =>
      node.getBoundingClientRect().left >= 0 &&
      node.getBoundingClientRect().right <= window.innerWidth + 1,
    );
    expect(fits).toBe(true);

    expect(await dialog.getByRole('listbox').count()).toBe(0);
    expect(await dialog.getByRole('option').count()).toBe(0);
    expect(await dialog.getByRole('button').count()).toBeGreaterThan(0);

    await input.press('Shift+Tab');
    await expect(dialog.locator('button').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(input).toBeFocused();

    for (let index = 0; index < 18; index += 1) {
      await input.press('ArrowDown');
    }
    const activeVisible = await dialog.evaluate((root) => {
      const status = root.querySelector('p.sr-only[role="status"]');
      const match = status?.textContent?.match(/(\d+) de (\d+) resultados/);
      if (!match) return false;
      const index = Number(match[1]) - 1;
      const item = document.getElementById(`global-search-result-${index}`);
      const region = document.getElementById('global-search-results');
      if (!item || !region) return false;
      const itemBounds = item.getBoundingClientRect();
      const regionBounds = region.getBoundingClientRect();
      return itemBounds.top >= regionBounds.top - 1 &&
        itemBounds.bottom <= regionBounds.bottom + 1;
    });
    expect(activeVisible).toBe(true);

    await dialog.getByRole('button', { name: 'Fechar busca global' }).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(openButton).toBeFocused();
  }
});

test('busca global: erro e rate limit preservam navegação local e retry', async ({ page, request }) => {
  test.setTimeout(90_000);
  const email = `qa-search-errors-${Date.now()}@example.test`;
  await createVerifiedUser({ name: 'QA Busca Erros', email, password });
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  let calls = 0;
  await page.route('**/api/search?*', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '13' },
        body: JSON.stringify({
          success: false,
          error: { code: 'GLOBAL_SEARCH_RATE_LIMITED', message: 'Limite de busca' },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { query: 'trans', groups: [], total: 0, limitPerGroup: 5, totalLimit: 20 },
        }),
      });
    }
  });

  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Busca global' });
  const input = dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
  await input.fill('trans');
  await expect(dialog.getByText(/Tente novamente em 13 segundos/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Transações Abrir funcionalidade$/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(dialog.getByText(/Tente novamente em 13 segundos/)).toHaveCount(0);
  expect(calls).toBeGreaterThanOrEqual(2);
  await page.unroute('**/api/search?*');
});
