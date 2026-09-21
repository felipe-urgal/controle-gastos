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

async function expectMinimumFontSize(locator, size = 14) {
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const current = locator.nth(index);
    await expect(current).toBeVisible();
    const fontSize = await current.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(size);
  }
}

async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

async function assertDesktopSidebarToggle(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dashboard');

  const sidebar = page.locator('aside[aria-label="Navegação principal"]');
  await expect(sidebar).toBeVisible();

  const expandedBox = await sidebar.boundingBox();
  expect(expandedBox).not.toBeNull();
  if (!expandedBox) throw new Error('Desktop sidebar should be visible');
  expect(expandedBox.width).toBeGreaterThanOrEqual(260);

  const beforeUrl = page.url();
  const collapseButton = page.getByRole('button', {
    name: /Recolher barra lateral — Controle de Gastos/,
  });
  await expect(collapseButton).toBeVisible();
  await collapseButton.click();

  await expect(page).toHaveURL(beforeUrl);
  await expect(
    page.getByRole('button', { name: /Expandir barra lateral — Controle de Gastos/ }),
  ).toBeVisible();

  const collapsedBox = await sidebar.boundingBox();
  expect(collapsedBox).not.toBeNull();
  if (!collapsedBox) throw new Error('Collapsed sidebar should remain visible');
  expect(collapsedBox.width).toBeLessThan(100);

  const mainContent = page.locator('#main-content');
  const mainBox = await mainContent.boundingBox();
  expect(mainBox).not.toBeNull();
  if (!mainBox) throw new Error('Main content should be visible');
  expect(mainBox.x).toBeLessThan(100);

  await page.getByRole('button', {
    name: /Expandir barra lateral — Controle de Gastos/,
  }).click();

  const restoredBox = await sidebar.boundingBox();
  expect(restoredBox).not.toBeNull();
  if (!restoredBox) throw new Error('Expanded sidebar should be restored');
  expect(restoredBox.width).toBeGreaterThanOrEqual(260);
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

async function assertFinancialRoutesAt320(page, accountName) {
  await page.setViewportSize({ width: 320, height: 740 });

  for (const route of ['/dashboard', '/contas', '/categorias', '/calendario', '/transacoes']) {
    await page.goto(route);
    await expect(page.locator('#main-content')).toBeVisible();
    await page.waitForLoadState('networkidle');

    if (route === '/dashboard') {
      await expect(page.getByText('Saldo disponível', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Principais categorias de gastos', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Ações rápidas', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /Nova transação/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Transferir/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Pagar/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Adicionar/ })).toBeVisible();
    }

    if (route === '/contas') {
      await expect(page.getByRole('heading', { name: 'Contas', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Resumo das contas no mobile', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Minhas contas', exact: true })).toBeVisible();
      await expect(page.getByText('Conta principal', { exact: true })).toBeVisible();
      await expect(page.getByText(accountName, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nova conta', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Controle de Gastos', exact: true })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    }

    if (route === '/transacoes') {
      await expect(page.getByText('Controle de Gastos', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Resumo do mês', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Todas', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Receitas', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Despesas', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pendentes', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Buscar e filtrar transações', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nova transação', exact: true }).first()).toBeVisible();
    }

    if (route === '/categorias') {
      const categoriesHeading = page.getByRole('heading', { name: 'Categorias', exact: true });
      await expect(categoriesHeading).toBeVisible();
      await expectMinimumFontSize(categoriesHeading);
      await expect(page.getByRole('region', { name: /Resumo do orçamento em/ })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Seções de categorias', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Categorias', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByLabel('Buscar categorias', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filtrar categorias', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nova categoria', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Controle de Gastos', exact: true })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

      await page.getByRole('button', { name: 'Alertas', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Alertas', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Distribuição', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Distribuição', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Categorias', exact: true }).click();
      await expect(page.getByLabel('Buscar categorias', { exact: true })).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/contas');
  await expect(page.getByText('Gerencie seu portfólio de contas com clareza e controle.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Resumo das contas no mobile', exact: true })).toHaveCount(0);

  await page.goto('/categorias');
  await expect(page.getByRole('heading', { name: 'Categorias / Limites', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suas categorias', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Distribuição dos gastos', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Seções de categorias', exact: true })).toHaveCount(0);
}

async function assertAccountWizardMobile(page, accountId, accountName) {
  await page.setViewportSize({ width: 320, height: 740 });

  await page.goto('/contas/nova');
  await expect(page.getByRole('heading', { name: 'Nova conta', exact: true })).toBeVisible();
  await expect(page.getByText('1/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vamos criar sua conta', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Controle de Gastos', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  const newAccountName = 'Conta wizard mobile';
  await page.getByLabel('Nome', { exact: true }).fill(newAccountName);
  await page.getByRole('button', { name: /^Investimentos/ }).click();
  await page.getByRole('button', { name: /USD/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  await expect(page.getByText('2/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Personalize sua conta', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Prévia da conta', exact: true })).toContainText(newAccountName);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('3/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revise sua conta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta', exact: true })).toBeVisible();
  await expect(page.getByText(newAccountName, { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(`/contas/alterar/${accountId}`);
  await expect(page.getByRole('heading', { name: 'Editar conta', exact: true })).toBeVisible();
  await expect(page.getByText('1/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atualize sua conta', exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(accountName);
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('2/3', { exact: true })).toBeVisible();
  await expect(page.getByText('Status', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeVisible();

  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('3/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar alterações', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/contas/nova');
  await expect(page.getByText('Cadastre uma conta para organizar movimentações. O saldo será sempre derivado das transações concluídas.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nome da conta', { exact: true })).toBeVisible();
}

async function assertQuickComposeMobile(page) {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/transacoes/nova');
  await expect(page.getByRole('heading', { name: 'Nova transação', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expect(page.getByText('Valor', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Detalhes', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Revisão', { exact: true }).first()).toBeVisible();

  const expenseButton = page.getByRole('button', { name: 'Despesa', exact: true });
  const incomeButton = page.getByRole('button', { name: 'Receita', exact: true });
  const continueButton = page.getByRole('button', { name: 'Continuar', exact: true }).last();
  const cancelButton = page.getByRole('button', { name: 'Cancelar', exact: true }).last();

  for (const target of [expenseButton, incomeButton, cancelButton]) {
    await expect(target).toBeVisible();
    await expectMinimumTarget(target);
  }

  await expect(page.getByText('Detalhes avançados', { exact: true })).toBeVisible();
  await continueButton.scrollIntoViewIfNeeded();
  await expect(continueButton).toBeVisible();
  await expectMinimumTarget(continueButton);
  await expectNoHorizontalOverflow(page);

  await page.goto('/transacoes/nova?mode=transfer');
  await expect(page.getByRole('heading', { name: 'Nova transferência', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Transferência', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Detalhes da transferência', { exact: true })).toBeVisible();

  await page.goto('/transacoes/nova?type=income');
  await expect(page.getByRole('button', { name: 'Receita', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.setViewportSize({ width: 1280, height: 720 });
}

async function assertAccountShowMobile(page, accountId, accountName, transactionDescription) {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(`/contas/show/${accountId}`);

  await expect(page.getByRole('heading', { name: accountName, exact: true }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Resumo da conta', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Seções da conta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Visão geral', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Atividade recente', exact: true })).toBeVisible();
  await expect(page.getByText(transactionDescription, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sobre a conta', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar conta', exact: true }).last()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Controle de Gastos', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Transações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transações', exact: true })).toBeVisible();
  await expect(page.getByText(transactionDescription, { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Reconciliação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reconciliação do extrato', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar reconciliação', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/contas/show/${accountId}`);
  await expect(page.getByRole('heading', { name: 'Detalhes da conta', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: accountName, exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Seções da conta', exact: true })).toHaveCount(0);
}

async function assertTransactionShowMobile(page, transactionDescription) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/transacoes');

  await page.getByRole('button', {
    name: `Abrir detalhe contextual da transação ${transactionDescription}`,
    exact: true,
  }).click();

  const detail = page.getByRole('dialog').filter({ hasText: transactionDescription });
  await expect(detail).toBeVisible();
  await detail.getByRole('link', { name: /Detalhes$/ }).click();
  await expect(page).toHaveURL(/\/transacoes\/show\//);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('heading', { name: 'Detalhes da transação', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: transactionDescription, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sobre', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conta e origem', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mais informações', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Estado do lançamento', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próximas ações', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar transação', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Duplicar/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir transação', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Controle de Gastos', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/transacoes');
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function assertFilterFocusManagement(page) {
  const trigger = page.getByRole('button', { name: /^Filtros\b/ }).first();
  await expect(trigger).toBeVisible();

  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  const closeButton = dialog.getByRole('button', { name: 'Fechar filtros', exact: true });
  const searchInput = dialog.getByLabel('Buscar transação...');

  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();
  await searchInput.focus();
  await expect(searchInput).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 740 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();

  const mobileDialogGeometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight: window.innerHeight,
    };
  });

  expect(mobileDialogGeometry.top).toBeGreaterThanOrEqual(0);
  expect(mobileDialogGeometry.bottom).toBeLessThanOrEqual(mobileDialogGeometry.viewportHeight + 1);
  expect(mobileDialogGeometry.height).toBeGreaterThan(0);
  expect(mobileDialogGeometry.height).toBeLessThan(mobileDialogGeometry.viewportHeight);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
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
  const previewButton = page.getByRole('button', { name: 'Revisar arquivo', exact: true });
  await expect(cancelLink).toBeVisible();
  await expect(previewButton).toBeVisible();
  await expectMinimumTarget(cancelLink);
  await expectMinimumTarget(previewButton);

  await cancelLink.click();
  await expect(page).toHaveURL(/\/transacoes$/);
}

async function assertImportPreviewReflow(page, accountId) {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/transacoes/importar');
  await expect(page.getByRole('heading', { name: 'Importar transações', exact: true })).toBeVisible();

  const accountSelect = page.getByRole('combobox').first();
  await expect(accountSelect).toBeVisible();
  await accountSelect.selectOption(accountId);
  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: 'reflow-mobile.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'data;descricao;valor\n2026-09-01;Compra importada com descrição longa para validar reflow em tela estreita;-123.45',
    ),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'reflow-mobile.csv', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const previewStatus = page.locator('section[aria-labelledby="preview-title"] header [role="status"]');
  await expect(previewStatus).toBeVisible();
  await expect(previewStatus).toHaveAttribute('aria-live', 'polite');
  await expect(previewStatus).toHaveAttribute('aria-atomic', 'true');
  await expect(previewStatus).toContainText('Revisar');
  await expect(previewStatus).toContainText('1');

  const actionSummary = page.getByText(/1 selecionada\(s\) para criar/).first();
  await expect(actionSummary).toBeVisible();
  const statusFontSize = await actionSummary.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(statusFontSize).toBeGreaterThanOrEqual(14);

  const actionStatus = actionSummary.locator('..');
  await expect(actionStatus).toHaveAttribute('role', 'status');
  await expect(actionStatus).toHaveAttribute('aria-live', 'polite');
  await expect(actionStatus).toHaveAttribute('aria-atomic', 'true');

  const actionBar = actionStatus.locator('xpath=../..');
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
  const accessibleTodayPrefix = `${today.day} Hoje`;
  const todayButton = page.getByRole('button', {
    name: new RegExp(`^${accessibleTodayPrefix}\\.`),
  });

  await expect(todayButton).toBeVisible();
  await expect(todayButton).toContainText(String(today.day));

  const accessibleName = await todayButton.getAttribute('aria-label');
  expect(accessibleName).toBeTruthy();
  expect(accessibleName?.startsWith(`${accessibleTodayPrefix}.`)).toBeTruthy();
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
  await assertDesktopSidebarToggle(page);

  const relations = await seedFinancialRelations(page, { accountName, categoryName });
  expect(relations.accountId).toBeTruthy();
  expect(relations.categoryId).toBeTruthy();

  await assertAccountWizardMobile(page, relations.accountId, accountName);
  await assertQuickComposeMobile(page);
  await page.goto('/transacoes/nova');
  await page.getByRole('button', { name: 'Conta', exact: true }).click();
  await page.getByRole('option', { name: accountName, exact: true }).click();
  await page.getByRole('button', { name: 'Categoria', exact: true }).click();
  await page.getByRole('option', { name: categoryName, exact: true }).click();
  await page.getByLabel(/^Valor\b/).fill('12345');
  await page.getByLabel(/^Descrição\b/).fill(transactionDescription);

  await expect(page.getByRole('button', { name: 'Despesa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Revisar e criar', exact: true }).click();

  const reviewDialog = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
  await expect(reviewDialog).toBeVisible();
  await expect(reviewDialog).toContainText('R$ 123,45');
  await expect(reviewDialog).toContainText(accountName);
  await expect(reviewDialog).toContainText(categoryName);
  await reviewDialog.getByRole('button', { name: 'Criar transação', exact: true }).click();

  await expect(page).toHaveURL(/\/transacoes$/);
  await expect(
    page.getByRole('button', {
      name: `Abrir detalhe contextual da transação ${transactionDescription}`,
      exact: true,
    }),
  ).toBeVisible();

  await assertTransactionShowMobile(page, transactionDescription);
  await assertAccountShowMobile(page, relations.accountId, accountName, transactionDescription);
  await assertFinancialRoutesAt320(page, accountName);
  await assertFilterFocusManagement(page);
  await assertImportActionTargets(page);
  await assertImportPreviewReflow(page, relations.accountId);
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
