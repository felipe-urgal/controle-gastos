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

async function expectBottomNavSuppressed(page) {
  const bottomNav = page.getByRole('navigation', {
    name: 'Navegação principal',
    includeHidden: true,
  });
  await expect(bottomNav).toBeAttached();
  await expect(bottomNav).toBeHidden();
}

async function expectControlIsTopmost(control) {
  await expect(control).toBeVisible();

  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );

    return {
      topmost: hit === element || (hit instanceof Node && element.contains(hit)),
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.topmost).toBeTruthy();
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
}

test('overlays mobile mantêm ações acessíveis sem competição com a navegação inferior', async ({ page }) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-mobile-overlay-${suffix}@example.test`;

  await createVerifiedUser({
      name: 'Playwright Mobile Overlay',
      email,
      password,
    });

  await login(page, email);
  await page.setViewportSize({ width: 390, height: 740 });

  await page.goto('/transacoes');
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();

  await page.locator('button[aria-haspopup="dialog"]:not([aria-label="Mais"]):visible').click();

  const periodDialog = page.getByRole('dialog', { name: 'Selecionar mês', exact: true });
  const applyPeriod = periodDialog.getByRole('button', { name: 'Aplicar período', exact: true });
  await expect(periodDialog).toBeVisible();
  await expectBottomNavSuppressed(page);
  await expectControlIsTopmost(applyPeriod);
  await applyPeriod.click();
  await expect(periodDialog).toBeHidden();
  await expect(bottomNav).toBeVisible();

  await page.getByRole('button', { name: /^Filtros\b/ }).click();
  const filterDialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  const applyFilters = filterDialog.getByRole('button', { name: 'Aplicar filtros', exact: true });
  await expect(filterDialog).toBeVisible();
  await expectBottomNavSuppressed(page);
  await expectControlIsTopmost(applyFilters);
  await filterDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(filterDialog).toBeHidden();
  await expect(bottomNav).toBeVisible();

  // Projeção no Dashboard: acessível no mobile, tela cheia abaixo da topbar e sem a bottom-nav.
  await page.goto('/dashboard');
  const forecastButton = page.getByRole('button', { name: 'Ver projeção', exact: true });
  await expect(forecastButton).toBeEnabled();
  await forecastButton.click();

  const forecastDialog = page.getByRole('dialog', { name: 'Saldo projetado', exact: true });
  await expect(forecastDialog).toBeVisible();
  await expectBottomNavSuppressed(page);

  const closeForecast = forecastDialog.getByRole('button', { name: 'Fechar projeção', exact: true });
  await expectControlIsTopmost(closeForecast);

  const forecastGeometry = await forecastDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportHeight: window.innerHeight };
  });
  expect(forecastGeometry.top).toBeGreaterThanOrEqual(64);
  expect(forecastGeometry.bottom).toBeLessThanOrEqual(forecastGeometry.viewportHeight + 1);

  await page.keyboard.press('Escape');
  await expect(forecastDialog).toBeHidden();
  await expect(bottomNav).toBeVisible();
});

test('ModalShell: foco inicial, Tab preso, Esc, clique no fundo e retorno do foco', async ({ page, browserName }) => {
  // Safari/WebKit não foca botões ao clicar: não há foco anterior a restaurar no botão de origem.
  const restoresFocusToTrigger = browserName !== 'webkit';
  test.setTimeout(60_000);

  const email = `playwright-modal-focus-${Date.now()}-${test.info().retry}@example.test`;
  await createVerifiedUser({ name: 'Playwright Modal Focus', email, password });
  await login(page, email);
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/transacoes');

  const trigger = page.getByRole('button', { name: /^Filtros\b/ });
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });

  // Foco inicial no diálogo e Tab nunca escapa dele.
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  for (let index = 0; index < 25; index += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBeTruthy();
  }
  for (let index = 0; index < 25; index += 1) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBeTruthy();
  }

  // Esc fecha e devolve o foco ao botão que abriu.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  if (restoresFocusToTrigger) await expect(trigger).toBeFocused();

  // Clique no fundo (faixa acima do sheet) fecha.
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.move(180, 8);
  await page.mouse.down();
  await page.mouse.up();
  await expect(dialog).toBeHidden();
  if (restoresFocusToTrigger) await expect(trigger).toBeFocused();
});
