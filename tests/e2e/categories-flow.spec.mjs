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

test('categorias: invariantes, planejamento, divisões e UX desktop/mobile', async ({ page }) => {
  test.setTimeout(180_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-categories-${suffix}@example.test`;
  const categoryName = `Mercado E2E ${suffix}`.slice(0, 50);
  const secondaryName = `Lazer E2E ${suffix}`.slice(0, 50);
  const emptyName = `Vazia E2E ${suffix}`.slice(0, 50);
  const transactionDescription = `Compra dividida E2E ${suffix}`;

  await createVerifiedUser({ name: 'QA Categorias', email, password });
  await login(page, email);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/categorias/nova', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Nova categoria', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nome da categoria', exact: true }).fill(categoryName);
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Descrição E2E');
  await page.getByRole('button', { name: 'Criar categoria', exact: true }).click();
  await expect(page).toHaveURL(/\/categorias$/);

  const fixture = await page.evaluate(
    async ({ primaryName, secondaryName: secondaryCategoryName, emptyName: emptyCategoryName, description }) => {
      async function json(url, options = {}) {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          ...options,
        });
        const body = await response.json();
        return { response, body };
      }

      const list = await json(
        `/api/categories?search=${encodeURIComponent(primaryName)}`,
        { method: 'GET' },
      );
      if (!list.response.ok) {
        throw new Error(`category lookup failed: ${JSON.stringify(list.body)}`);
      }
      const primary = list.body.data.items.find((item) => item.name === primaryName);
      if (!primary) throw new Error('created category not found');

      const duplicate = await json('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: primaryName,
          type: 'EXPENSE',
          color: '#3B82F6',
          icon: 'tag',
          description: null,
          isActive: true,
          position: 0,
        }),
      });

      const immutable = await json(`/api/categories/${primary.id}`, {
        method: 'PUT',
        body: JSON.stringify({ type: 'INCOME' }),
      });

      async function createCategory(name) {
        const result = await json('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name,
            type: 'EXPENSE',
            color: '#8B5CF6',
            icon: 'tag',
            description: null,
            isActive: true,
            position: 0,
          }),
        });
        if (!result.response.ok) {
          throw new Error(`category create failed: ${JSON.stringify(result.body)}`);
        }
        return result.body.data;
      }

      const secondary = await createCategory(secondaryCategoryName);
      const empty = await createCategory(emptyCategoryName);

      const accountResult = await json('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: `Conta categorias ${primaryName}`.slice(0, 50),
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          color: '#3B82F6',
          icon: 'wallet',
          description: null,
          isActive: true,
        }),
      });
      if (!accountResult.response.ok) {
        throw new Error(`account create failed: ${JSON.stringify(accountResult.body)}`);
      }

      const now = new Date();
      const transactionResult = await json('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: 10000,
          type: 'EXPENSE',
          description,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          accountId: accountResult.body.data.id,
          categoryId: primary.id,
          status: 'COMPLETED',
          allocations: [
            { categoryId: primary.id, amount: 6000 },
            { categoryId: secondary.id, amount: 4000 },
          ],
        }),
      });
      if (!transactionResult.response.ok) {
        throw new Error(`transaction create failed: ${JSON.stringify(transactionResult.body)}`);
      }

      const limitResult = await json('/api/category-limits', {
        method: 'PUT',
        body: JSON.stringify({
          categoryId: primary.id,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          currency: 'BRL',
          amount: 0,
        }),
      });
      if (!limitResult.response.ok) {
        throw new Error(`limit create failed: ${JSON.stringify(limitResult.body)}`);
      }

      return {
        primary,
        secondary,
        empty,
        duplicate: {
          status: duplicate.response.status,
          code: duplicate.body.error?.code,
        },
        immutable: {
          status: immutable.response.status,
          code: immutable.body.error?.code,
        },
      };
    },
    {
      primaryName: categoryName,
      secondaryName,
      emptyName,
      description: transactionDescription,
    },
  );

  expect(fixture.duplicate).toEqual({
    status: 409,
    code: 'CATEGORY_NAME_CONFLICT',
  });
  expect(fixture.immutable).toEqual({
    status: 409,
    code: 'CATEGORY_TYPE_IMMUTABLE',
  });

  await page.goto(`/categorias/alterar/${fixture.primary.id}`);
  await expect(page.getByRole('radio', { name: 'Despesa', exact: true })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'Receita', exact: true })).toBeDisabled();
  await page.getByLabel('Descrição', { exact: true }).fill('');
  await page.getByRole('checkbox', { name: /^Categoria ativa\b/ }).uncheck();
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();

  await expect(page).toHaveURL(
    new RegExp(`/categorias/show/${fixture.primary.id}$`),
  );
  await expect(
    page.getByText('Sem descrição cadastrada.', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('Inativa', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Excluir categoria', exact: true });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText('Categoria possui transações vinculadas');
  await deleteDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(deleteDialog).toBeHidden();

  await page.goto(
    `/transacoes?categoryId=${encodeURIComponent(fixture.secondary.id)}`,
  );
  await expect(
    page.getByText(transactionDescription, { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/categorias');
  await page.getByLabel('Buscar categorias', { exact: true }).fill(categoryName);
  const mobileCard = page
    .getByRole('button')
    .filter({ hasText: categoryName })
    .first();
  await expect(mobileCard).toBeVisible();
  await expect(mobileCard).toContainText('Inativa');
  await expect(mobileCard).toContainText('Excedido');

  await page.getByRole('button', { name: 'Filtrar categorias', exact: true }).click();
  const filtersDialog = page.getByRole('dialog', { name: 'Filtros', exact: true });
  await expect(filtersDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(filtersDialog).toBeHidden();

  await mobileCard.click();
  const categoryDialog = page.getByRole('dialog', { name: categoryName, exact: true });
  await expect(categoryDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(categoryDialog).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/categorias/show/${fixture.empty.id}`);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  const emptyDeleteDialog = page.getByRole('dialog', {
    name: 'Excluir categoria',
    exact: true,
  });
  await emptyDeleteDialog.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page).toHaveURL(/\/categorias$/);
});
