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
  test.skip(({ browserName }) => browserName !== 'chromium', 'roda só no chromium');

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
});
