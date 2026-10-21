import { expect } from '@playwright/test';

import { setIsolatedClientIp } from './client-ip.mjs';
import { createVerifiedUser } from './verified-user.mjs';

export const PASSWORD = 'Playwright123!';
export const MOBILE_WIDTHS = [320, 360, 390];
export const DESKTOP_WIDTH = 1280;
const MOBILE_HEIGHT = 780;

/** Cria usuário verificado, loga e devolve identificadores únicos do cenário. */
export async function startScenario(page, testInfo, prefix, { showValues = true } = {}) {
  const suffix = `${Date.now()}-${testInfo.project.name}-${prefix}`;
  const email = `qa-${prefix}-${suffix}@example.test`;
  await createVerifiedUser({ name: `QA ${prefix}`, email, password: PASSWORD, showValues });
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return { email, suffix };
}

/** Chamada de API autenticada pelo cookie da página; retorna `data`. */
export async function api(page, method, url, data) {
  return page.evaluate(
    async ({ method: m, url: u, data: d }) => {
      const response = await fetch(u, {
        method: m,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: d === undefined ? undefined : JSON.stringify(d),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`${m} ${u} failed: ${response.status} ${JSON.stringify(body)}`);
      }
      return body.data;
    },
    { method, url, data },
  );
}

export async function createAccount(page, name, currency = 'BRL', type = 'CREDIT_DEBIT') {
  return api(page, 'POST', '/api/accounts', {
    name: name.slice(0, 50),
    type,
    currency,
    color: '#2563EB',
    icon: 'wallet',
    description: null,
    isActive: true,
  });
}

export async function createCategory(page, name, type = 'EXPENSE') {
  return api(page, 'POST', '/api/categories', {
    name: name.slice(0, 50),
    type,
    color: '#EF4444',
    icon: 'tag',
    description: null,
    isActive: true,
    position: 0,
  });
}

export async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

/**
 * Safe-area: com a página rolada até o fim, nenhum chrome fixo no rodapé pode
 * cobrir o último conteúdo (o layout deve reservar o espaço do inset inferior).
 */
export async function expectBottomContentClearOfFixedChrome(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const result = await page.evaluate(() => {
    const fixedBottoms = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position !== 'fixed') return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.height > 0 &&
          rect.width > window.innerWidth * 0.6 &&
          Math.abs(rect.bottom - window.innerHeight) <= 1
        );
      })
      .map((element) => element.getBoundingClientRect().top);
    const main = document.querySelector('main');
    if (!main || fixedBottoms.length === 0) return { ok: true };
    // Último texto renderizado dentro de <main> (fora de ancestrais fixos).
    let last = 0;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('[aria-hidden="true"]')) continue;
      // Conteúdo de <details> fechado não é renderizado (só o <summary>), mesmo que o Range ainda devolva caixa.
      const closedDetails = parent.closest('details:not([open])');
      if (closedDetails && !parent.closest('summary')) continue;
      let fixed = false;
      for (let el = parent; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position === 'fixed') { fixed = true; break; }
      }
      if (fixed) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.height === 0) continue;
      // Ignora texto recortado por contêineres com overflow (carrosséis/tabelas).
      let clipped = false;
      for (let el = parent; el && el !== main; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
        const box = el.getBoundingClientRect();
        if (rect.bottom > box.bottom + 1 || rect.top < box.top - 1) { clipped = true; break; }
      }
      if (clipped) continue;
      last = Math.max(last, rect.bottom);
    }
    return { ok: last <= Math.min(...fixedBottoms) + 1, last, fixedTop: Math.min(...fixedBottoms) };
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

/** Roda `check(width)` em 320/360/390 (e opcionalmente 1280) sem overflow. */
export async function forEachWidth(page, check, { desktop = true } = {}) {
  const widths = desktop ? [...MOBILE_WIDTHS, DESKTOP_WIDTH] : MOBILE_WIDTHS;
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === DESKTOP_WIDTH ? 900 : MOBILE_HEIGHT });
    await check(width);
    await expectNoHorizontalOverflow(page);
    if (width !== DESKTOP_WIDTH) await expectBottomContentClearOfFixedChrome(page);
  }
}

// Valor monetário formatado (R$ 1.234,56 | 1.234,56 | US$ ... | € ...), exceto percentuais.
const MONEY = /(?:R\$|US\$|€)\s* ?\d|\b\d{1,3}(?:\.\d{3})*,\d{2}\b(?!\s*%)/;

/** Texto visível + atributos acessíveis do documento (inclui dialogs). */
export async function collectSurface(page) {
  return page.evaluate(() => {
    // `value`/`placeholder` de campos editáveis ficam fora: ações explícitas
    // (ex.: pagar parcela) pré-preenchem o formulário que o usuário confirma e
    // placeholders são exemplos de formato, não dados.
    const attributes = ['aria-label', 'title', 'alt', 'data-tooltip', 'aria-valuetext'];
    const strings = [document.body.innerText];
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        if (value) strings.push(value);
      }
    }
    return strings;
  });
}

/** showValues=false: nenhum valor monetário (texto, aria-label, title...) pode vazar. */
export async function expectNoMoneyLeak(page, extraNeedles = []) {
  const strings = await collectSurface(page);
  const leaks = strings.filter(
    (text) => MONEY.test(text) || extraNeedles.some((needle) => text.includes(needle)),
  );
  expect(leaks.map((text) => text.slice(0, 120))).toEqual([]);
}

export async function expectMasked(page) {
  await expect
    .poll(() => page.evaluate(() => document.body.innerText.includes('••••')))
    .toBe(true);
}
