import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

/**
 * Smoke de layout mobile: percorre as rotas autenticadas em viewports estreitos
 * e falha se a página gerar rolagem horizontal ou tiver mais de um <h1> visível.
 *
 * As listas KNOWN_* são dívidas conhecidas e só podem diminuir: ao corrigir uma
 * rota, remova-a da lista (o teste também falha se uma rota listada passar a
 * estar correta, para forçar a limpeza).
 *
 * Alvos de toque < 44×44 px seguem um limite por rota (KNOWN_SMALL_TARGETS, padrão 0):
 * o teste falha se uma rota passar do limite; ao corrigir, reduza o número.
 * `LAYOUT_SMOKE_REPORT=1` imprime o detalhe dos alvos pequenos.
 */
const password = 'Playwright123!';
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 780 },
  { width: 768, height: 900 },
];
const ROUTES = [
  '/dashboard',
  '/transacoes',
  '/transacoes/nova',
  '/transacoes/importar',
  '/transacoes/importar/regras',
  '/contas',
  '/contas/nova',
  '/categorias',
  '/categorias/nova',
  '/investimentos',
  '/patrimonio',
  '/rendimentos-trabalho',
  '/dividas',
  '/metas',
  '/compromissos',
  '/fechamento',
  '/comparar',
  '/calendario',
  '/recorrencias',
  '/modelos',
  '/tags',
  '/estabelecimentos',
  '/usuario',
  '/usuario/editar',
];

// rota -> motivo/issue. Preencher a partir do primeiro relatório.
const KNOWN_HORIZONTAL_OVERFLOW = new Map([]);
const KNOWN_MULTIPLE_H1 = new Map([]);
// rotas que já montam uma única árvore: nenhum <h1> duplicado no DOM (nem escondido).
const SINGLE_TREE_ROUTES = ['/contas'];
// rota -> máximo tolerado de alvos < 44×44 px (usuário sem dados, 360 e 390 px; não vale em tablet).
const KNOWN_SMALL_TARGETS = new Map([
  ['/dashboard', 1],
  ['/categorias', 3],
  ['/calendario', 40], // inclui as células do mês (varia com o mês exibido)
  ['/modelos', 1],
]);

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function measure() {
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const interactive = [
    ...document.querySelectorAll('a[href], button, select, textarea, input:not([type="hidden"]), [role="button"]'),
  ].filter(visible);
  const small = interactive
    .filter((element) => !element.matches('a[href="#main-content"]'))
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 2 && rect.height > 2 && (rect.width < 44 || rect.height < 44))
    .map(({ element, rect }) => ({
      tag: element.tagName.toLowerCase(),
      label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 40),
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
    }));

  // O wrapper do layout corta o excesso horizontal (overflow-x: clip), então o
  // scrollWidth do documento não vê conteúdo estourando. Medimos dentro de #main-content:
  // elementos visíveis cuja borda direita passa da tela e que não estão dentro de um
  // contêiner rolável/cortado (abas rolantes, tabelas com overflow-x).
  const main = document.getElementById('main-content') ?? document.body;
  const clipped = (element) => {
    for (let node = element.parentElement; node && node !== main; node = node.parentElement) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX !== 'visible') return true;
    }
    return false;
  };
  const escaping = [...main.querySelectorAll('*')]
    .filter((element) => visible(element) && getComputedStyle(element).position !== 'fixed')
    .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1 && !clipped(element));
  const widest = escaping.reduce((max, element) => Math.max(max, element.getBoundingClientRect().right), 0);

  return {
    escapingTag: escaping[0] ? `${escaping[0].tagName.toLowerCase()}.${String(escaping[0].className).slice(0, 60)}` : '',
    overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, Math.round(widest - window.innerWidth)),
    h1: [...document.querySelectorAll('h1')].filter(visible).length,
    h1InDom: document.querySelectorAll('h1').length,
    small,
  };
}

test.describe('layout mobile', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'smoke de layout roda só no chromium');

  test('rotas autenticadas sem rolagem horizontal, um único h1 e alvos de toque sob controle', async ({ page }) => {
    test.setTimeout(240_000);
    const suffix = `${Date.now()}-${test.info().retry}`;
    const email = `playwright-layout-${suffix}@example.test`;
    await createVerifiedUser({ name: 'Playwright Layout', email, password });
    await login(page, email);

    const overflow = [];
    const multipleH1 = [];
    const smallTargets = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        const result = await page.evaluate(measure);

        if (result.overflow > 1) overflow.push(`${route} @${viewport.width} (+${result.overflow}px ${result.escapingTag})`);
        if (SINGLE_TREE_ROUTES.includes(route) && result.h1InDom > 1) {
          multipleH1.push(`${route} @${viewport.width} (${result.h1InDom} h1 no DOM)`);
        }
        if (result.h1 > 1) multipleH1.push(`${route} @${viewport.width} (${result.h1} h1)`);
        const allowed = KNOWN_SMALL_TARGETS.get(route) ?? 0;
        // Em ≥640px os controles são compactos por design; o limite vale só para o mobile.
        if (viewport.width < 640 && result.small.length > allowed) {
          smallTargets.push(`${route} @${viewport.width}: ${result.small.length} > ${allowed} ${JSON.stringify(result.small.slice(0, 5))}`);
        }
        if (process.env.LAYOUT_SMOKE_REPORT) {
          console.log(`[layout] ${route} @${viewport.width} pequenos=${result.small.length}`, JSON.stringify(result.small.slice(0, 8)));
        }
      }
    }

    const routeOf = (entry) => entry.split(' @')[0];
    const unexpectedOverflow = overflow.filter((entry) => !KNOWN_HORIZONTAL_OVERFLOW.has(routeOf(entry)));
    const unexpectedH1 = multipleH1.filter((entry) => !KNOWN_MULTIPLE_H1.has(routeOf(entry)));
    const staleOverflow = [...KNOWN_HORIZONTAL_OVERFLOW.keys()].filter((route) => !overflow.some((entry) => routeOf(entry) === route));
    const staleH1 = [...KNOWN_MULTIPLE_H1.keys()].filter((route) => !multipleH1.some((entry) => routeOf(entry) === route));

    console.log('[layout] overflow:', JSON.stringify(overflow));
    console.log('[layout] múltiplos h1:', JSON.stringify(multipleH1));

    expect(smallTargets, 'rotas com mais alvos < 44px que o limite').toEqual([]);
    expect(unexpectedOverflow, 'rotas com rolagem horizontal').toEqual([]);
    expect(unexpectedH1, 'rotas com mais de um h1 visível').toEqual([]);
    expect(staleOverflow, 'rotas corrigidas: remover de KNOWN_HORIZONTAL_OVERFLOW').toEqual([]);
    expect(staleH1, 'rotas corrigidas: remover de KNOWN_MULTIPLE_H1').toEqual([]);
  });
});
