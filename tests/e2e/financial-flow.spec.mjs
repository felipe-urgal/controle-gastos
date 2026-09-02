import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function seedFinancialRelations(page, { accountName, categoryName }) {
  return page.evaluate(async ({ accountName: account, categoryName: category }) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(body)}`);
      }

      return body.data;
    }

    const createdAccount = await create('/api/accounts', {
      name: account,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#22C55E',
      icon: 'wallet',
      description: 'Conta isolada do E2E',
      isActive: true,
    });

    const createdCategory = await create('/api/categories', {
      name: category,
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: 'Categoria isolada do E2E',
      isActive: true,
      position: 0,
    });

    return {
      accountId: createdAccount.id,
      categoryId: createdCategory.id,
    };
  }, { accountName, categoryName });
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectMinimumTarget(locator, size = 44) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Interactive target should be visible');
  expect(box.width).toBeGreaterThanOrEqual(size);
  expect(box.height).toBeGreaterThanOrEqual(size);
}

async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

async function assertMobileShell(page, width) {
  await page.setViewportSize({ width, height: 740 });

  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(bottomNav).toBeVisible();

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollPaddingTop: Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingTop,
    ),
    scrollPaddingBottom: Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingBottom,
    ),
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  expect(viewport.scrollPaddingTop).toBeGreaterThanOrEqual(64);
  expect(viewport.scrollPaddingBottom).toBeGreaterThanOrEqual(68);

  const criticalTopbarTargets = [
    page.getByRole('link', { name: 'Controle de Gastos', exact: true }),
    page.getByRole('button', { name: /^Usar tema (claro|escuro)$/ }),
    page.getByRole('link', { name: 'Abrir perfil', exact: true }),
    page.getByRole('button', { name: 'Sair da conta', exact: true }).first(),
  ];

  for (const target of criticalTopbarTargets) {
    await expectMinimumTarget(target);
  }

  const navigationLinks = bottomNav.getByRole('link');
  await expect(navigationLinks).toHaveCount(5);

  for (let index = 0; index < 5; index += 1) {
    await expectMinimumTarget(navigationLinks.nth(index));
  }

  const focusSpacing = await page.getByRole('link', { name: 'Controle de Gastos', exact: true }).evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      top: Number.parseFloat(styles.scrollMarginTop),
      bottom: Number.parseFloat(styles.scrollMarginBottom),
    };
  });

  expect(focusSpacing.top).toBeGreaterThanOrEqual(64);
  expect(focusSpacing.bottom).toBeGreaterThanOrEqual(68);
}

async function assertFinancialRoutesAt320(page) {
  await page.setViewportSize({ width: 320, height: 740 });

  for (const route of ['/dashboard', '/contas', '/categorias', '/calendario', '/transacoes']) {
    await page.goto(route);
    await expect(page.locator('#main-content')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
}

async function assertFilterFocusManagement(page) {
  const trigger = page.getByRole('button', { name: /^Filtros\b/ }).first();
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  const panelId = await trigger.getAttribute('aria-controls');
  expect(panelId).toBeTruthy();
  if (!panelId) throw new Error('Filter trigger must control a panel');

  const panel = page.locator(`[id="${panelId}"]`);
  const searchInput = page.getByLabel('Buscar transação...');

  await expect(panel).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Tab');
  await expect(searchInput).not.toBeFocused();

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await expect(searchInput).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(searchInput).toBeFocused();
  await page.locator('body').dispatchEvent('mousedown');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 740 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(searchInput).toBeFocused();

  const mobilePanelStyle = await panel.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      maxHeight: Number.parseFloat(styles.maxHeight),
      overflowY: styles.overflowY,
    };
  });

  expect(mobilePanelStyle.maxHeight).toBeGreaterThan(0);
  expect(mobilePanelStyle.maxHeight).toBeLessThan(740);
  expect(mobilePanelStyle.overflowY).toBe('auto');

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function assertImportActionTargets(page) {
  const importLink = page.getByRole('link', { name: 'Importar CSV/OFX', exact: true });
  await expect(importLink).toBeVisible();
  await expectMinimumTarget(importLink);

  await importLink.click();
  await expect(page).toHaveURL(/\/transacoes\/importar$/);

  const cancelLink = page.getByRole('link', { name: 'Cancelar', exact: true });
  const previewButton = page.getByRole('button', { name: 'Gerar preview', exact: true });
  await expect(cancelLink).toBeVisible();
  await expect(previewButton).toBeVisible();
  await expectMinimumTarget(cancelLink);
  await expectMinimumTarget(previewButton);

  await cancelLink.click();
  await expect(page).toHaveURL(/\/transacoes$/);
}

async function assertImportPreviewReflow(page, accountName) {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/transacoes/importar');
  await expect(page.getByRole('heading', { name: 'Importar transações', exact: true })).toBeVisible();

  await page.getByLabel(/^Conta\b/).selectOption({ label: `${accountName} · BRL` });
  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: 'reflow-mobile.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'data;descricao;valor\n2026-09-01;Compra importada com descrição longa para validar reflow em tela estreita;-123.45',
    ),
  });
  await page.getByRole('button', { name: 'Gerar preview', exact: true }).click();

  await expect(page.getByRole('heading', { name: '2. Revise antes de confirmar', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const validBadge = page.getByText('1 válidas', { exact: true });
  await expect(validBadge).toBeVisible();
  const statusFontSize = await validBadge.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(statusFontSize).toBeGreaterThanOrEqual(14);

  const actionSummary = page.getByText(/1 selecionada\(s\)/).first();
  const actionBar = actionSummary.locator('..');
  const bottomNav = page.getByRole('navigation', { name: 'Navegação principal' });
  await actionBar.scrollIntoViewIfNeeded();
  await expect(bottomNav).toBeVisible();

  const actionBarBox = await actionBar.boundingBox();
  const bottomNavBox = await bottomNav.boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(bottomNavBox).not.toBeNull();
  if (!actionBarBox || !bottomNavBox) {
    throw new Error('Import action bar and bottom navigation should be visible');
  }
  expect(actionBarBox.y + actionBarBox.height).toBeLessThanOrEqual(bottomNavBox.y);

  await page.goto('/transacoes');
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function assertCalendarTodayLabelInName(page) {
  await page.goto('/calendario');

  const today = await page.evaluate(() => ({
    day: new Date().getDate(),
  }));
  const visibleLabel = `${today.day} Hoje`;
  const todayButton = page.getByRole('button', {
    name: new RegExp(`^${visibleLabel}\\.`),
  });

  await expect(todayButton).toBeVisible();
  await expect(todayButton).toContainText(String(today.day));
  await expect(todayButton).toContainText('Hoje');

  const accessibleName = await todayButton.getAttribute('aria-label');
  expect(accessibleName).toBeTruthy();
  expect(accessibleName?.startsWith(`${visibleLabel}.`)).toBeTruthy();
}

test('login, fluxo financeiro, sessão inválida e logout', async ({ page, request }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-${suffix}@example.test`;
  const accountName = `Conta E2E reflow ${suffix}`;
  const categoryName = `Categoria E2E reflow ${suffix}`;
  const transactionDescription = `Compra E2E reflow 320px ${suffix}`;

  const signupResponse = await request.post('/api/auth/signup', {
    data: {
      name: 'Playwright E2E',
      email,
      password,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await login(page, email);

  for (const width of [320, 360, 390]) {
    await assertMobileShell(page, width);
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  const relations = await seedFinancialRelations(page, { accountName, categoryName });
  expect(relations.accountId).toBeTruthy();
  expect(relations.categoryId).toBeTruthy();

  await page.goto('/transacoes/nova');
  await page.getByLabel(/^Conta\b/).selectOption({ label: accountName });
  await page.getByLabel(/^Categoria\b/).selectOption({ label: categoryName });
  await page.getByLabel(/^Valor\b/).fill('12345');
  await page.getByLabel(/^Descrição\b/).fill(transactionDescription);
  await page.getByRole('button', { name: 'Criar transação', exact: true }).click();

  await expect(page).toHaveURL(/\/transacoes$/);
  await expect(
    page.getByRole('link', {
      name: `Abrir detalhes da transação ${transactionDescription}`,
      exact: true,
    }),
  ).toBeVisible();

  await assertFinancialRoutesAt320(page);
  await assertFilterFocusManagement(page);
  await assertImportActionTargets(page);
  await assertImportPreviewReflow(page, accountName);
  await assertCalendarTodayLabelInName(page);

  await page.context().clearCookies();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar na sua conta', exact: true })).toBeVisible();

  await login(page, email);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
