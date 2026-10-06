import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('tags: acesso direto sem sessão redireciona para login', async ({ page }) => {
  await page.goto('/tags');
  await expect(page).toHaveURL(/\/login$/);
});

test('tags: criar contexto, associar à transação e consultar sem alterar o lançamento', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-tags-${suffix}@example.test`;
  const tagName = `ferias-${suffix}`;
  const description = `Viagem E2E ${suffix}`;

  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA Tags', email, password },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/tags');
  await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible();
  await page.getByLabel('Nova tag', { exact: true }).fill(tagName);
  await page.getByRole('button', { name: 'Criar tag', exact: true }).click();
  await expect(page.getByText(`#${tagName}`, { exact: true })).toBeVisible();

  const seeded = await page.evaluate(async ({ tagName: name, description: transactionDescription }) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`${url}: ${response.status} ${JSON.stringify(body)}`);
      return body.data;
    }

    const tagsResponse = await fetch('/api/tags');
    const tagsBody = await tagsResponse.json();
    const tag = tagsBody.data.items.find((item) => item.name === name);
    if (!tag) throw new Error('tag not found');

    const account = await create('/api/accounts', {
      name: 'Conta Tags E2E',
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#22C55E',
      icon: 'wallet',
      description: 'Conta para tags',
      isActive: true,
    });
    const category = await create('/api/categories', {
      name: 'Viagem Tags E2E',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: 'Categoria para tags',
      isActive: true,
      position: 0,
    });
    const transaction = await create('/api/transactions', {
      amount: 12345,
      description: transactionDescription,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      accountId: account.id,
      categoryId: category.id,
      type: 'EXPENSE',
      status: 'COMPLETED',
      tagIds: [tag.id],
    });

    return { tagId: tag.id, transactionId: transaction.id };
  }, { tagName, description });

  await page.goto(`/transacoes/show/${seeded.transactionId}`);
  await expect(page.getByText(`#${tagName}`, { exact: true })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  const filtered = await page.evaluate(async (tagId) => {
    const response = await fetch(`/api/transactions?tagId=${encodeURIComponent(tagId)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(`filter failed: ${response.status}`);
    return body.data.items;
  }, seeded.tagId);

  expect(filtered).toHaveLength(1);
  expect(filtered[0]).toMatchObject({
    id: seeded.transactionId,
    description,
    tags: [{ id: seeded.tagId, name: tagName }],
  });
});
