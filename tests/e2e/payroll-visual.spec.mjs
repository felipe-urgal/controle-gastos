import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { measure } from './support/layout-measure.mjs';
import { seedPayrollFixture } from './support/payroll-fixture.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const WIDTHS = [320, 360, 390, 430, 640, 768, 900, 1024, 1280];
const THEMES = ['light', 'dark'];
const TABS = ['Mensal', 'Conciliação bancária', 'Anual / IR'];
const SHOTS_DIR = process.env.SHOTS_DIR;

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function setShowValues(page, showValues) {
  const ok = await page.evaluate(async (value) => {
    const response = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showValues: value }),
    });
    return response.ok;
  }, showValues);
  expect(ok).toBe(true);
}

test.describe('rendimentos do trabalho: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px, texto ≥12px e um único h1 visível', async ({ page }) => {
    test.setTimeout(480_000);
    const email = `playwright-payroll-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Payroll Visual', email, password });
    await seedPayrollFixture(email);
    await login(page, email);

    const failures = [];
    for (const showValues of [true, false]) {
      await setShowValues(page, showValues);
      for (const theme of THEMES) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto('/rendimentos-trabalho');
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.evaluate((value) => {
            try { window.localStorage.setItem('theme', value); } catch {}
            document.documentElement.setAttribute('data-theme', value);
          }, theme);
          // Os dados semeados são de 2025: exibe esse ano na aba mensal.
          await page.getByLabel('Ano dos rendimentos mensais').selectOption('2025');
          await page.waitForLoadState('networkidle').catch(() => {});

          for (const tab of TABS) {
            await page.getByRole('button', { name: tab, exact: true }).click();
            await page.waitForLoadState('networkidle').catch(() => {});
            // Aguarda as transições de cor (transition-colors) terminarem antes de medir/capturar.
            await page.waitForTimeout(400);

            const result = await page.evaluate(measure, width <= 430);
            const visibleH1 = await page.locator('h1:visible').count();
            const where = `/rendimentos-trabalho [${tab}] @${width} ${theme} showValues=${showValues}`;
            if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
            if (visibleH1 !== 1) failures.push(`${where}: ${visibleH1} h1 visíveis`);
            for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
            for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
            for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

            if (SHOTS_DIR) {
              mkdirSync(SHOTS_DIR, { recursive: true });
              const slug = tab.toLowerCase().replace(/[^a-z]+/g, '-');
              await page.screenshot({
                path: `${SHOTS_DIR}/payroll-${slug}-${width}-${theme}-${showValues ? 'on' : 'off'}.png`,
                fullPage: true,
              });
            }
          }
          await page.getByRole('button', { name: 'Mensal', exact: true }).click();
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
