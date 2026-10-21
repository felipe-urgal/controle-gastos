import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1000 },
];
// Telas de listagem/painel: todas devem ocupar a largura do shell (`--orbit-page-max-width`).
const ROUTES = [
  '/dashboard',
  '/transacoes',
  '/contas',
  '/categorias',
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
];

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// Largura útil do shell e do bloco de página que contém o `h1` (filho direto do contêiner da página).
function measureWidths() {
  const shell = document.querySelector('.orbit-page-container');
  const heading = [...document.querySelectorAll('h1')].find((element) => element.offsetParent !== null);
  if (!shell || !heading) return null;
  const style = getComputedStyle(shell);
  const inner = shell.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
  let block = heading;
  while (block.parentElement && block.parentElement !== shell) block = block.parentElement;
  return { inner: Math.round(inner), block: Math.round(block.getBoundingClientRect().width) };
}

test.describe('largura do conteúdo padronizada entre as páginas', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'medição roda em chromium');

  test('o bloco principal de cada tela ocupa a largura do shell', async ({ page }) => {
    test.setTimeout(300_000);
    const email = `playwright-width-${Date.now()}-${test.info().retry}@example.test`;
    await createVerifiedUser({ name: 'Playwright Width', email, password });
    await login(page, email);

    const failures = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        const widths = await page.evaluate(measureWidths);
        if (!widths) {
          failures.push(`${route} @${viewport.width}: sem h1 visível ou contêiner de página`);
          continue;
        }
        if (widths.block < widths.inner - 1) {
          failures.push(`${route} @${viewport.width}: conteúdo ${widths.block}px < shell ${widths.inner}px`);
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
