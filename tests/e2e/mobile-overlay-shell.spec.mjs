import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedAccount(page, name) {
  return page.evaluate(async (accountName) => {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: accountName,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        color: '#7C3AED',
        icon: 'wallet',
        description: 'Conta para validar overlay mobile',
        isActive: true,
      }),
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(`Falha ao criar conta: ${response.status} ${JSON.stringify(body)}`);
    }

    return body.data;
  }, name);
}

async function expectBottomNavSuppressed(page) {
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
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

test('overlays mobile mantêm ações acessíveis sem competição com a navegação inferior', async ({ page, request }) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-mobile-overlay-${suffix}@example.test`;
  const accountName = `Conta overlay ${suffix}`;

  const signupResponse = await request.post('/api/auth/signup', {
    data: {
      name: 'Playwright Mobile Overlay',
      email,
      password,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await login(page, email);
  await seedAccount(page, accountName);
  await page.setViewportSize({ width: 390, height: 740 });

  await page.goto('/transacoes');
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();

  await page.locator('button[aria-haspopup="dialog"]').click();

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

  await page.goto('/contas');
  await page.getByRole('button', { name: new RegExp(accountName) }).click();

  const accountSheet = page.locator(`aside[aria-label="Detalhe da conta ${accountName}"]`);
  await expect(accountSheet).toBeVisible();
  await expectBottomNavSuppressed(page);

  const sheetGeometry = await accountSheet.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      maxHeight: Number.parseFloat(getComputedStyle(element).maxHeight),
      overflowY: getComputedStyle(element).overflowY,
    };
  });

  expect(sheetGeometry.top).toBeGreaterThanOrEqual(64);
  expect(sheetGeometry.bottom).toBeLessThanOrEqual(sheetGeometry.viewportHeight + 1);
  expect(sheetGeometry.maxHeight).toBeGreaterThan(0);
  expect(sheetGeometry.maxHeight).toBeLessThanOrEqual(sheetGeometry.viewportHeight);
  expect(sheetGeometry.overflowY).toBe('auto');

  const closeButton = accountSheet.getByRole('button', { name: 'Fechar detalhe', exact: true });
  await expectControlIsTopmost(closeButton);
  await closeButton.click();
  await expect(accountSheet).toBeHidden();

  await page.goto('/dashboard');
  const forecastButton = page.getByRole('button', { name: 'Ver projeção', exact: true });
  await expect(forecastButton).toBeEnabled();
  await forecastButton.click();

  const forecastDialog = page.getByRole('dialog', { name: 'Saldo projetado', exact: true });
  await expect(forecastDialog).toBeVisible();
  await expectBottomNavSuppressed(page);

  const forecastGeometry = await forecastDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      overflowY: getComputedStyle(element).overflowY,
    };
  });

  expect(forecastGeometry.top).toBeGreaterThanOrEqual(64);
  expect(forecastGeometry.bottom).toBeLessThanOrEqual(forecastGeometry.viewportHeight + 1);
  expect(forecastGeometry.overflowY).toBe('auto');

  const closeForecast = forecastDialog.getByRole('button', { name: 'Fechar projeção', exact: true });
  await expectControlIsTopmost(closeForecast);
});
