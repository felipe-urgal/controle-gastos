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
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error('Topbar target should be visible');
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const navigationLinks = bottomNav.getByRole('link');
  await expect(navigationLinks).toHaveCount(5);

  for (let index = 0; index < 5; index += 1) {
    const box = await navigationLinks.nth(index).boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error('Bottom navigation target should be visible');
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
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
  await page.getByRole('heading', { name: 'Movimentações', exact: true }).click();
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

test('login, fluxo financeiro, sessão inválida e logout', async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-${suffix}@example.test`;
  const accountName = `Conta E2E ${suffix}`;
  const categoryName = `Categoria E2E ${suffix}`;
  const transactionDescription = `Compra E2E ${suffix}`;

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

  await assertFilterFocusManagement(page);

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
