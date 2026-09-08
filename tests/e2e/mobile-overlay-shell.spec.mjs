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

async function expectLayerCoversBottomNav(page, layer) {
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();
  await expect(layer).toBeVisible();

  const covered = await layer.evaluate((element) => {
    const nav = document.querySelector('nav[aria-label="Navegação principal"]');
    if (!(nav instanceof HTMLElement)) return false;

    const rect = nav.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = Math.min(window.innerHeight - 2, rect.top + 8);
    const hit = document.elementFromPoint(x, y);

    return hit instanceof Node && element.contains(hit);
  });

  expect(covered).toBeTruthy();
}

async function expectControlIsTopmost(control) {
  await expect(control).toBeVisible();

  const topmost = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );

    return hit === element || (hit instanceof Node && element.contains(hit));
  });

  expect(topmost).toBeTruthy();
}

test('overlays mobile mantêm ações acima da navegação inferior', async ({ page, request }) => {
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
  await page.locator('button[aria-haspopup="dialog"]').click();

  const periodDialog = page.getByRole('dialog', { name: 'Selecionar mês', exact: true });
  const applyPeriod = periodDialog.getByRole('button', { name: 'Aplicar período', exact: true });
  await expectLayerCoversBottomNav(page, periodDialog);
  await expectControlIsTopmost(applyPeriod);
  await applyPeriod.click();
  await expect(periodDialog).toBeHidden();

  await page.getByRole('button', { name: /^Filtros\b/ }).click();
  const filterDialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  const applyFilters = filterDialog.getByRole('button', { name: 'Aplicar filtros', exact: true });
  await expectLayerCoversBottomNav(page, filterDialog);
  await expectControlIsTopmost(applyFilters);
  await filterDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(filterDialog).toBeHidden();

  await page.goto('/contas');
  await page.getByRole('button', { name: new RegExp(accountName) }).click();

  const accountSheet = page.locator(`aside[aria-label="Detalhe da conta ${accountName}"]`);
  await expectLayerCoversBottomNav(page, accountSheet);

  const sheetGeometry = await accountSheet.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      maxHeight: Number.parseFloat(getComputedStyle(element).maxHeight),
      overflowY: getComputedStyle(element).overflowY,
    };
  });

  expect(sheetGeometry.bottom).toBeLessThanOrEqual(sheetGeometry.viewportHeight + 1);
  expect(sheetGeometry.maxHeight).toBeGreaterThan(0);
  expect(sheetGeometry.maxHeight).toBeLessThanOrEqual(sheetGeometry.viewportHeight);
  expect(sheetGeometry.overflowY).toBe('auto');

  const closeButton = accountSheet.getByRole('button', { name: 'Fechar detalhe', exact: true });
  await expectControlIsTopmost(closeButton);
});
