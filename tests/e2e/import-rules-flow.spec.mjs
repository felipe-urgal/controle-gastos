import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

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
    normalizedDescription,
  },
) {
  return page.evaluate(
    async ({
      accountName: account,
      suggestedCategoryName: suggestedCategory,
      overrideCategoryName: overrideCategory,
      ruleName: rule,
      description: pattern,
      normalizedDescription: normalized,
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
        normalizedDescription: normalized,
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
      normalizedDescription,
    },
  );
}

test('preview aplica sugestão, override manual prevalece e confirmação persiste a categoria escolhida', async ({ page, request }) => {
  test.setTimeout(75_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `playwright-import-rules-${suffix}@example.test`;
  const accountName = `Conta regras E2E ${suffix}`;
  const suggestedCategoryName = `Categoria sugerida ${suffix}`;
  const overrideCategoryName = `Categoria override ${suffix}`;
  const ruleName = `Regra mercado E2E ${suffix}`;
  const description = `Mercado importado E2E ${suffix}`;
  const normalizedDescription = `Mercado normalizado E2E ${suffix}`;
  const fileName = `import-rules-${suffix}.csv`;

  const signupResponse = await request.post('/api/auth/signup', {
    data: {
      name: 'Playwright Import Rules E2E',
      email,
      password,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await login(page, email);

  const relations = await seedImportRuleScenario(page, {
    accountName,
    suggestedCategoryName,
    overrideCategoryName,
    ruleName,
    description,
    normalizedDescription,
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
  await expect(detail.getByText(normalizedDescription, { exact: true })).toBeVisible();

  const categorySelect = detail.getByLabel('Categoria', { exact: true });
  await expect(categorySelect).toHaveValue(relations.suggestedCategoryId);
  await expect(detail.getByText('Pronta', { exact: true })).toBeVisible();

  await categorySelect.selectOption(relations.overrideCategoryId);
  await expect(categorySelect).toHaveValue(relations.overrideCategoryId);
  await expect(
    detail.getByRole('button', { name: 'Criar regra com esta classificação', exact: true }),
  ).toBeVisible();

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
