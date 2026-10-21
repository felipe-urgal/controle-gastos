import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { measure } from './support/layout-measure.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280];
const THEMES = ['light', 'dark'];
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password'];
const SHOTS_DIR = process.env.SHOTS_DIR;

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function setTheme(page, theme) {
  await page.evaluate((value) => {
    try { window.localStorage.setItem('theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
  await page.waitForTimeout(400);
}

async function inspect(page, label, width, failures) {
  const result = await page.evaluate(measure, width <= 430);
  const visibleH1 = await page.locator('h1:visible').count();
  if (result.overflow > 1) failures.push(`${label}: overflow +${result.overflow}px`);
  if (visibleH1 > 1) failures.push(`${label}: ${visibleH1} h1 visíveis`);
  for (const item of result.smallTargets) failures.push(`${label}: alvo pequeno ${item}`);
  for (const item of result.smallInputs) failures.push(`${label}: input <16px ${item}`);
  for (const item of result.smallText) failures.push(`${label}: texto <12px ${item}`);
}

async function shot(page, name) {
  if (!SHOTS_DIR) return;
  mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png` });
}

test.describe('shell, busca, auth e usuário: validação visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('telas públicas e de autenticação (larguras × tema)', async ({ page }) => {
    test.setTimeout(300_000);
    const failures = [];

    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        for (const route of PUBLIC_ROUTES) {
          await page.goto(route);
          await page.waitForLoadState('networkidle').catch(() => {});
          await setTheme(page, theme);
          await inspect(page, `${route} @${width} ${theme}`, width, failures);
          await shot(page, `public${route.replace(/\//g, '_')}-${width}-${theme}`);
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('shell autenticado, busca global, menu Mais e usuário (larguras × tema × showValues)', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-shell-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Shell Visual', email, password });
    await login(page, email);
    const failures = [];

    for (const showValues of [true, false]) {
      await page.evaluate(async (value) => {
        const response = await fetch('/api/user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showValues: value }),
        });
        if (!response.ok) throw new Error(`PATCH /api/user: ${response.status}`);
      }, showValues);

      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          const tag = `@${width} ${theme} showValues=${showValues}`;

          for (const route of ['/usuario', '/usuario/editar']) {
            await page.goto(route);
            await page.waitForLoadState('networkidle').catch(() => {});
            await setTheme(page, theme);
            await inspect(page, `${route} ${tag}`, width, failures);
            await shot(page, `user${route.replace(/\//g, '_')}-${width}-${theme}-${showValues ? 'on' : 'off'}`);
          }

          // Busca global aberta (sheet de tela cheia no mobile).
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle').catch(() => {});
          await setTheme(page, theme);
          await page.keyboard.press('Control+k');
          const search = page.getByRole('dialog', { name: 'Busca global' });
          await expect(search).toBeVisible();
          await inspect(page, `busca ${tag}`, width, failures);
          await shot(page, `search-${width}-${theme}-${showValues ? 'on' : 'off'}`);
          await page.keyboard.press('Escape');
          await expect(search).toBeHidden();

          // Menu "Mais" (só existe na navegação mobile).
          if (width < 1024) {
            await page.getByRole('button', { name: 'Mais', exact: true }).click();
            const more = page.getByRole('dialog');
            await expect(more).toBeVisible();
            await inspect(page, `menu Mais ${tag}`, width, failures);
            await shot(page, `more-${width}-${theme}-${showValues ? 'on' : 'off'}`);
            await page.keyboard.press('Escape');
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('360×640 com teclado aberto: login e busca continuam utilizáveis', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 360, height: 640 });

    // Login: com o teclado simulado (viewport baixo) o botão Entrar fica acessível por rolagem.
    await page.goto('/login');
    const emailField = page.getByLabel(/^E-mail\b/);
    await emailField.focus();
    await page.setViewportSize({ width: 360, height: 340 });
    const submit = page.getByRole('button', { name: 'Entrar', exact: true });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport({ ratio: 1 });
    await page.setViewportSize({ width: 360, height: 640 });

    const email = `playwright-shell-kbd-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Shell Kbd', email, password });
    await login(page, email);

    // Busca: campo no topo e primeiro resultado alcançável com teclado simulado.
    await page.getByRole('button', { name: 'Abrir busca global', exact: true }).click();
    const search = page.getByRole('dialog', { name: 'Busca global' });
    await expect(search).toBeVisible();
    await page.setViewportSize({ width: 360, height: 340 });
    const box = await search.boundingBox();
    expect(box.height).toBeLessThanOrEqual(340 + 1);
    const input = search.getByRole('searchbox');
    await expect(input).toBeInViewport({ ratio: 1 });
    const firstResult = search.locator('[id^="global-search-result-"]').first();
    await firstResult.scrollIntoViewIfNeeded();
    await expect(firstResult).toBeInViewport({ ratio: 1 });
    expect((await firstResult.boundingBox()).height).toBeGreaterThanOrEqual(44);
  });
});
