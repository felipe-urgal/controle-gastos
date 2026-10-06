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
  const renamedTagName = `viagem-${suffix}`;
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
    tags: [{ id: seeded.tagId, name: tagName, isActive: true }],
  });

  await page.goto('/tags');
  await page.getByRole('button', { name: `Renomear tag ${tagName}` }).click();
  await page.getByLabel('Novo nome da tag').fill(renamedTagName);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText(`#${renamedTagName}`, { exact: true })).toBeVisible();

  await page
    .getByRole('button', { name: `Relatório da tag ${renamedTagName}` })
    .click();
  await expect(page.getByText('Todo o histórico', { exact: true })).toBeVisible();
  const openTransactions = page.getByRole('link', { name: 'Abrir transações' });
  await expect(openTransactions).toHaveAttribute(
    'href',
    `/transacoes?tagId=${encodeURIComponent(seeded.tagId)}`,
  );
  await openTransactions.click();
  await expect(page).toHaveURL(
    new RegExp(`/transacoes\\?tagId=${seeded.tagId}import { expect, test } from '@playwright/test';

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
  const renamedTagName = `viagem-${suffix}`;
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
),
  );
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  await page.goto('/tags');
  await page
    .getByRole('button', { name: `Arquivar tag ${renamedTagName}` })
    .click();
  await expect(page.getByText('Arquivada', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: new RegExp(`Não é possível excluir ${renamedTagName}`),
    }),
  ).toBeDisabled();

  await page
    .getByRole('button', { name: `Reativar tag ${renamedTagName}` })
    .click();
  await expect(page.getByText('Ativa', { exact: true })).toBeVisible();

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow, `overflow horizontal em ${width}px`).toBe(false);
  }
});

test('tags: sucesso da mutação não vira falha quando o refresh posterior falha', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${test.info().project.name}-refresh`;
  const email = `qa-tags-refresh-${suffix}@example.test`;
  const tagName = `refresh-${suffix}`;

  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA Tags Refresh', email, password },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, email);
  await page.goto('/tags');
  await expect(page.getByText('Nenhuma tag cadastrada.', { exact: true })).toBeVisible();

  let failNextList = true;
  await page.route('**/api/tags*', async (route) => {
    if (route.request().method() === 'GET' && failNextList) {
      failNextList = false;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Falha de refresh simulada' },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.getByLabel('Nova tag', { exact: true }).fill(tagName);
  await page.getByRole('button', { name: 'Criar tag', exact: true }).click();

  await expect(
    page.getByText(`#${tagName} criada com sucesso.`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Falha de refresh simulada', { exact: true })).toBeVisible();
  await expect(page.getByText('Erro ao criar tag', { exact: true })).toHaveCount(0);

  const persisted = await page.evaluate(async (name) => {
    const response = await fetch(
      `/api/tags?page=1&pageSize=50&search=${encodeURIComponent(name)}`,
    );
    const body = await response.json();
    return body.data.items.some((tag) => tag.name === name);
  }, tagName);
  expect(persisted).toBe(true);
});
