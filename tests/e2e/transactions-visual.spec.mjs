import { mkdirSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const WIDTHS = [320, 360, 390, 430, 768, 1280];
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

function measure(isNarrow) {
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const doc = document.documentElement;
  const interactive = [
    ...document.querySelectorAll('a[href], button, select, textarea, input:not([type="hidden"]), [role="button"]'),
  ].filter(visible);

  const smallTargets = isNarrow
    ? interactive
        .filter((element) => !element.matches('a[href="#main-content"], input[type="checkbox"], input[type="radio"], input[type="file"]'))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 2 && rect.height > 2 && (rect.width < 44 || rect.height < 44))
        .map(({ element, rect }) => `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 30)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`)
    : [];

  const smallInputs = isNarrow
    ? interactive
        .filter((element) => element.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), select, textarea'))
        .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => `${element.tagName.toLowerCase()} ${getComputedStyle(element).fontSize}`)
    : [];

  // Texto de conteúdo < 12 px (ignora ícones/SVG e elementos sem texto próprio).
  const smallText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || !visible(parent) || parent.closest('svg, script, style')) continue;
    if (Number.parseFloat(getComputedStyle(parent).fontSize) < 12) {
      smallText.push(`${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 30)}"`);
    }
  }

  return {
    overflow: doc.scrollWidth - doc.clientWidth,
    smallTargets,
    smallInputs,
    smallText,
  };
}

test.describe('transações: validação visual (larguras × tema × showValues)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('sem overflow horizontal, alvos ≥44px, inputs ≥16px e texto ≥12px', async ({ page }) => {
    test.setTimeout(420_000);
    const email = `playwright-tx-visual-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Tx Visual', email, password });
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
    const category = await api(page, 'POST', '/api/categories', {
      name: 'Alimentação e Supermercado',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: '',
      isActive: true,
      position: 0,
    });
    const now = new Date();
    let firstId = '';
    for (const [index, [description, amount]] of [
      ['Supermercado do bairro com descrição bem longa para testar quebra de linha', 34567],
      ['Padaria', 1890],
      ['Restaurante japonês', 18900],
    ].entries()) {
      const created = await api(page, 'POST', '/api/transactions', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: Math.min(index + 1, 28),
        accountId: account.id,
        categoryId: category.id,
        status: 'COMPLETED',
        type: 'EXPENSE',
        amount,
        description,
      });
      firstId ||= created.id;
    }

    const routes = [
      '/transacoes',
      '/transacoes/nova',
      '/transacoes/importar',
      '/transacoes/importar/regras',
      `/transacoes/show/${firstId}`,
    ];
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
            const where = `${route.replace(firstId, '[id]')} @${width} ${theme} showValues=${showValues}`;
            if (result.overflow > 1) failures.push(`${where}: overflow +${result.overflow}px`);
            for (const item of result.smallTargets) failures.push(`${where}: alvo pequeno ${item}`);
            for (const item of result.smallInputs) failures.push(`${where}: input <16px ${item}`);
            for (const item of result.smallText) failures.push(`${where}: texto <12px ${item}`);

            if (SHOTS_DIR) {
              mkdirSync(SHOTS_DIR, { recursive: true });
              const name = route.replace(firstId, 'id').replace(/\//g, '_');
              await page.screenshot({ path: `${SHOTS_DIR}/${name}-${width}-${theme}-${showValues ? 'on' : 'off'}.png` });
            }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
