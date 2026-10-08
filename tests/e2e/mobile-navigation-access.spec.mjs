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

test('mobile expõe todas as áreas pelo menu Mais sem sobrecarregar a bottom nav', async ({
  page,
}) => {
  test.setTimeout(60_000);

  const suffix = String(Date.now()) + '-' + String(test.info().retry);
  const email = 'mobile-navigation-' + suffix + '@example.test';

  await createVerifiedUser({
      name: 'QA Navegação Mobile',
      email,
      password,
    });

  await page.setViewportSize({ width: 390, height: 760 });
  await login(page, email);

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Início', exact: true })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Transações', exact: true })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Contas', exact: true })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Calendário', exact: true })).toBeVisible();
  await expect(bottomNav.getByRole('button', { name: 'Mais', exact: true })).toBeVisible();
  await expect(bottomNav.getByRole('link', { name: 'Categorias', exact: true })).toHaveCount(0);

  await bottomNav.getByRole('button', { name: 'Mais', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Mais opções', exact: true });
  await expect(dialog).toBeVisible();

  const expectedDestinations = [
    '/fechamento',
    '/comparar',
    '/compromissos',
    '/modelos',
    '/recorrencias',
    '/metas',
    '/patrimonio',
    '/investimentos',
    '/rendimentos-trabalho',
    '/dividas',
    '/categorias',
    '/estabelecimentos',
    '/tags',
  ];

  for (const href of expectedDestinations) {
    await expect(dialog.locator('a[href="' + href + '"]')).toHaveCount(1);
  }

  const filter = dialog.getByLabel('Filtrar funcionalidades', { exact: true });
  await filter.fill('invest');
  await expect(dialog.getByRole('link', { name: 'Investimentos', exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Categorias', exact: true })).toHaveCount(0);

  await dialog.getByRole('link', { name: 'Investimentos', exact: true }).click();
  await expect(page).toHaveURL(/\/investimentos$/);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await page.getByRole('button', { name: 'Mais', exact: true }).click();
    const responsiveDialog = page.getByRole('dialog', { name: 'Mais opções', exact: true });
    await expect(responsiveDialog).toBeVisible();

    const geometry = await responsiveDialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    await responsiveDialog.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  }
});

test('busca global encontra módulos e ações sem remover a busca de dados', async ({
  page,
}) => {
  const suffix = String(Date.now()) + '-' + String(test.info().retry);
  const email = 'mobile-launcher-' + suffix + '@example.test';

  await createVerifiedUser({
      name: 'QA Launcher Mobile',
      email,
      password,
    });

  await page.setViewportSize({ width: 390, height: 760 });
  await login(page, email);

  await page.getByRole('button', { name: 'Abrir busca global', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Busca global', exact: true });
  await expect(dialog.getByText('Ações rápidas', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Ir para', { exact: true })).toBeVisible();

  const input = dialog.getByLabel(
    'Buscar em páginas, transações, contas, categorias e regras',
    { exact: true },
  );
  await input.fill('invest');

  const investments = dialog.getByRole('option').filter({ hasText: 'Investimentos' });
  await expect(investments).toHaveCount(1);
  await investments.click();
  await expect(page).toHaveURL(/\/investimentos$/);
});

test('manifest PWA oferece atalhos úteis para uso mobile', async ({ request }) => {
  const response = await request.get('/manifest.json');
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual(
    expect.arrayContaining([
      '/transacoes/nova',
      '/transacoes',
      '/compromissos',
      '/dashboard',
    ]),
  );
});
