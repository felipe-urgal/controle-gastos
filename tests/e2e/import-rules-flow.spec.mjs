import { Buffer } from 'node:buffer';

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

async function seedImportRuleScenario(
  page,
  {
    accountName,
    suggestedCategoryName,
    overrideCategoryName,
    ruleName,
    description,
  },
) {
  return page.evaluate(
    async ({
      accountName: account,
      suggestedCategoryName: suggestedCategory,
      overrideCategoryName: overrideCategory,
      ruleName: rule,
      description: pattern,
    }) => {
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
        description: 'Conta isolada do E2E de regras',
        isActive: true,
      });

      const createdSuggestedCategory = await create('/api/categories', {
        name: suggestedCategory,
        type: 'EXPENSE',
        color: '#EF4444',
        icon: 'tag',
        description: 'Categoria sugerida pelo E2E',
        isActive: true,
        position: 0,
      });

      const createdOverrideCategory = await create('/api/categories', {
        name: overrideCategory,
        type: 'EXPENSE',
        color: '#F97316',
        icon: 'tag',
        description: 'Categoria escolhida no override do E2E',
        isActive: true,
        position: 1,
      });

      const createdRule = await create('/api/import-rules', {
        name: rule,
        isActive: true,
        priority: 0,
        accountId: createdAccount.id,
        transactionType: 'EXPENSE',
        descriptionOperator: 'EQUALS',
        descriptionPattern: pattern,
        minAmountCents: null,
        maxAmountCents: null,
        categoryId: createdSuggestedCategory.id,
      });

      return {
        accountId: createdAccount.id,
        suggestedCategoryId: createdSuggestedCategory.id,
        overrideCategoryId: createdOverrideCategory.id,
        ruleId: createdRule.id,
      };
    },
    {
      accountName,
      suggestedCategoryName,
      overrideCategoryName,
      ruleName,
      description,
    },
  );
}

test('preview aplica sugestão, override manual prevalece e confirmação persiste a categoria escolhida', async ({ page }) => {
  test.setTimeout(75_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-import-rules-${suffix}@example.test`;
  const accountName = `Conta regras E2E ${suffix}`;
  const suggestedCategoryName = `Categoria sugerida ${suffix}`;
  const overrideCategoryName = `Categoria override ${suffix}`;
  const ruleName = `Regra mercado E2E ${suffix}`;
  const description = `Mercado importado E2E ${suffix}`;
  const fileName = `import-rules-${suffix}.csv`;

  await createVerifiedUser({
      name: 'Playwright Import Rules E2E',
      email,
      password,
    });

  await login(page, email);

  const relations = await seedImportRuleScenario(page, {
    accountName,
    suggestedCategoryName,
    overrideCategoryName,
    ruleName,
    description,
  });

  expect(relations.accountId).toBeTruthy();
  expect(relations.suggestedCategoryId).toBeTruthy();
  expect(relations.overrideCategoryId).toBeTruthy();
  expect(relations.ruleId).toBeTruthy();

  await page.goto('/transacoes/importar');
  await expect(page.getByRole('heading', { name: 'Importar transações', exact: true })).toBeVisible();

  const accountSelect = page.getByRole('combobox').first();
  await accountSelect.selectOption(relations.accountId);
  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: fileName,
    mimeType: 'text/csv',
    buffer: Buffer.from(`data;descricao;valor\n2026-09-09;${description};-42.50`),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  await expect(page.getByRole('heading', { name: fileName, exact: true })).toBeVisible();

  const detail = page.locator('aside[aria-labelledby^="import-detail-"]').filter({ hasText: description });
  await expect(detail).toBeVisible();
  await expect(detail.getByText(ruleName, { exact: true })).toBeVisible();

  const categorySelect = detail.getByLabel('Categoria', { exact: true });
  await expect(categorySelect).toHaveValue(relations.suggestedCategoryId);
  await expect(detail.getByText('Estabelecimento não reconhecido', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Continuar sem estabelecimento', exact: true }).click();
  await expect(detail.getByText('Pronta', { exact: true })).toBeVisible();

  await categorySelect.selectOption(relations.overrideCategoryId);
  await expect(categorySelect).toHaveValue(relations.overrideCategoryId);
  const createRuleButton = detail.getByRole('button', {
    name: 'Criar regra com esta classificação',
    exact: true,
  });
  await expect(createRuleButton).toBeVisible();
  await createRuleButton.click();
  await expect(
    detail.getByText(
      `Já existe uma regra com o mesmo padrão e outro resultado: ${ruleName}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Criar regra', exact: true })).toBeDisabled();

  const confirmButton = page.getByRole('button', { name: 'Confirmar 1', exact: true });
  await expect(confirmButton).toBeEnabled();

  const confirmRequestPromise = page.waitForRequest(
    (candidate) =>
      candidate.method() === 'POST' &&
      candidate.url().endsWith('/api/transactions/import/confirm'),
  );

  await confirmButton.click();
  const confirmRequest = await confirmRequestPromise;
  const confirmPayload = confirmRequest.postDataJSON();
  const confirmedItem = confirmPayload.items[0];

  expect(confirmedItem.categoryId).toBe(relations.overrideCategoryId);
  expect(confirmedItem.description).toBe(description);
  expect(Object.hasOwn(confirmedItem, 'matchedRuleId')).toBe(false);
  expect(Object.hasOwn(confirmedItem, 'matchedRuleName')).toBe(false);
  expect(Object.hasOwn(confirmedItem, 'suggestedCategoryId')).toBe(false);
  expect(Object.hasOwn(confirmedItem, 'suggestedDescription')).toBe(false);

  await expect(page.getByText('Importação concluída', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1 transação(ões) criada(s)', exact: true })).toBeVisible();

  const persistedTransactions = await page.evaluate(async () => {
    const response = await fetch('/api/transactions');
    const body = await response.json();

    if (!response.ok) {
      throw new Error(`/api/transactions failed with ${response.status}: ${JSON.stringify(body)}`);
    }

    return body.data?.items ?? [];
  });

  expect(persistedTransactions).toHaveLength(1);
  expect(persistedTransactions[0].description).toBe(description);
  expect(persistedTransactions[0].category.id).toBe(relations.overrideCategoryId);
  expect(persistedTransactions[0].category.name).toBe(overrideCategoryName);
});


test('correção manual aprende categoria e estabelecimento apenas quando solicitado', async ({ page }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-learning-${test.info().retry}`;
  const email = `playwright-import-learning-${suffix}@example.test`;
  const accountName = `Conta aprendizado ${suffix}`;
  const categoryName = `Categoria aprendizado ${suffix}`.slice(0, 50);
  const description = `Assinatura aprendizado ${suffix}`;
  const merchantName = `Estabelecimento aprendizado ${suffix}`;
  const firstFile = `learning-first-${suffix}.csv`;
  const secondFile = `learning-second-${suffix}.csv`;

  await createVerifiedUser({
      name: 'Playwright Import Learning E2E',
      email,
      password,
    });

  await login(page, email);

  const relations = await page.evaluate(
    async ({ accountName: accountLabel, categoryName: categoryLabel, merchantName: merchantLabel }) => {
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

      const account = await create('/api/accounts', {
        name: accountLabel,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        color: '#2563EB',
        icon: 'wallet',
        description: 'Conta do aprendizado explícito',
        isActive: true,
      });

      const category = await create('/api/categories', {
        name: categoryLabel,
        type: 'EXPENSE',
        color: '#F97316',
        icon: 'tag',
        description: 'Categoria do aprendizado explícito',
        isActive: true,
        position: 0,
      });

      const merchant = await create('/api/merchants', {
        name: merchantLabel,
        description: 'Estabelecimento do aprendizado explícito',
        isActive: true,
      });

      return {
        accountId: account.id,
        categoryId: category.id,
        merchantId: merchant.id,
      };
    },
    { accountName, categoryName, merchantName },
  );

  await page.goto('/transacoes/importar');
  await page.getByRole('combobox').first().selectOption(relations.accountId);
  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: firstFile,
    mimeType: 'text/csv',
    buffer: Buffer.from(`data;descricao;valor\n2026-09-10;${description};-39.90`),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  const firstDetail = page.locator('aside[aria-labelledby^="import-detail-"]').filter({ hasText: description });
  await expect(firstDetail).toBeVisible();
  const firstCategory = firstDetail.getByLabel('Categoria', { exact: true });
  await firstCategory.selectOption(relations.categoryId);
  const firstMerchant = firstDetail.getByLabel('Estabelecimento', { exact: true });
  await firstMerchant.selectOption(relations.merchantId);
  await firstDetail
    .getByLabel('Aprender esta descrição para próximas importações', { exact: true })
    .check();

  const createRuleButton = firstDetail.getByRole('button', {
    name: 'Criar regra com esta classificação',
    exact: true,
  });
  await expect(createRuleButton).toBeVisible();
  await createRuleButton.click();

  const ruleForm = firstDetail.getByRole('form', {
    name: 'Criar regra com esta classificação',
  });
  await expect(ruleForm).toBeVisible();
  const generatedRuleName = await ruleForm.getByLabel('Nome da regra', { exact: true }).inputValue();
  expect(generatedRuleName).toContain(description);

  await ruleForm.getByRole('button', { name: 'Criar regra', exact: true }).click();
  await expect(
    firstDetail.getByText('Regra criada. Ela será avaliada nos próximos previews.', {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar 1', exact: true }).click();
  await expect(page.getByText('Importação concluída', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Importar outro arquivo', exact: true }).click();

  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: secondFile,
    mimeType: 'text/csv',
    buffer: Buffer.from(`data;descricao;valor\n2026-09-11;${description};-41.25`),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  const secondDetail = page.locator('aside[aria-labelledby^="import-detail-"]').filter({ hasText: description });
  await expect(secondDetail).toBeVisible();
  await expect(secondDetail.getByText(generatedRuleName, { exact: true })).toBeVisible();
  await expect(secondDetail.getByLabel('Categoria', { exact: true })).toHaveValue(relations.categoryId);
  await expect(secondDetail.getByText(merchantName, { exact: true })).toBeVisible();
  await expect(secondDetail.getByLabel('Estabelecimento', { exact: true })).toHaveValue(relations.merchantId);
  await expect(secondDetail.getByText('Pronta', { exact: true })).toBeVisible();
});


test('detalhe mobile mantém foco, Escape e largura segura em 320/360/390', async ({ page }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-mobile-${test.info().retry}`;
  const email = `playwright-import-mobile-${suffix}@example.test`;
  const description = `Compra mobile ${suffix}`;
  await createVerifiedUser({
      name: 'Playwright Import Mobile E2E',
      email,
      password,
    });
  await login(page, email);

  const accountId = await page.evaluate(async (label) => {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: label,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        color: '#2563EB',
        icon: 'wallet',
        description: 'Conta do teste mobile',
        isActive: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(body));
    return body.data.id;
  }, `Conta mobile ${suffix}`);

  const hideValues = await page.evaluate(async () => {
    const response = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showValues: false }),
    });
    return response.ok;
  });
  expect(hideValues).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/transacoes/importar');
  await page.getByRole('combobox').first().selectOption(accountId);
  await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
    name: `mobile-${suffix}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(`data;descricao;valor\n2026-10-07;${description};-39.90`),
  });
  await page.getByRole('button', { name: 'Revisar arquivo', exact: true }).click();

  const row = page.locator('li').filter({ hasText: description }).getByRole('button').first();
  await expect(row).toBeVisible();
  expect((await page.locator('body').innerText()).includes('39,90')).toBe(false);
  const leakedAccessibleAmounts = await page.locator('[aria-label], [title]').evaluateAll(
    (elements) =>
      elements
        .map((element) =>
          [element.getAttribute('aria-label'), element.getAttribute('title')]
            .filter(Boolean)
            .join(' '),
        )
        .filter((value) => value.includes('39,90') || value.includes('3990')),
  );
  expect(leakedAccessibleAmounts).toEqual([]);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await row.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(width);

    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
  }
});
