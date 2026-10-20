import { expect, test } from '@playwright/test';
import { horizontalOverflow } from './support/layout.mjs';

/**
 * Smoke de layout das rotas públicas (landing e autenticação) em viewports estreitos:
 * sem estouro horizontal, um único <h1> visível e controles de formulário ≥ 44px de altura.
 */
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 390, height: 780 },
];
const ROUTES = ['/', '/login', '/signup', '/forgot-password'];

test.describe('layout mobile (rotas públicas)', () => {
  test.skip(({ browserName }) => !['chromium', 'webkit'].includes(browserName), 'smoke de layout roda em chromium e webkit');

  test('landing e telas de autenticação sem estouro, h1 único e campos de 44px', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});

        const { overflow, tag } = await page.evaluate(horizontalOverflow);
        if (overflow > 1) problems.push(`${route} @${viewport.width}: estouro +${overflow}px ${tag}`);

        const result = await page.evaluate(() => {
          const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          const h1 = [...document.querySelectorAll('h1')].filter(visible).length;
          const smallFields = [...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea')]
            .filter(visible)
            .filter((element) => element.getBoundingClientRect().height < 44)
            .map((element) => `${element.tagName.toLowerCase()}[${element.getAttribute('name') ?? element.getAttribute('type') ?? ''}] ${Math.round(element.getBoundingClientRect().height)}px`);
          return { h1, smallFields };
        });

        if (result.h1 !== 1) problems.push(`${route} @${viewport.width}: ${result.h1} h1 visíveis`);
        if (result.smallFields.length > 0) problems.push(`${route} @${viewport.width}: campos <44px ${JSON.stringify(result.smallFields)}`);
      }
    }

    console.log('[layout-public]', JSON.stringify(problems));
    expect(problems).toEqual([]);
  });
});
