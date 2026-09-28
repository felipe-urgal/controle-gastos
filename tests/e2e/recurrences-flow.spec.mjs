import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

function monthAt(offset) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 10);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: 10 };
}

async function create(request, url, data) {
  const response = await request.post(url, { data });
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return body.data;
}

test('recorrências: candidato exige confirmação antes de virar série formal', async ({ page, request }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-recurrence-${suffix}@example.test`;
  const description = `Streaming E2E ${suffix}`;

  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA Recorrências', email, password },
  });
  expect(signup.ok()).toBeTruthy();

  const login = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();

  const account = await create(request, '/api/accounts', {
    name: `Conta Recorrência E2E ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    description: 'Conta isolada do E2E de recorrências',
    isActive: true,
  });

  const category = await create(request, '/api/categories', {
    name: `Assinaturas E2E ${suffix}`,
    type: 'EXPENSE',
    color: '#EF4444',
    icon: 'tag',
    description: 'Categoria isolada do E2E de recorrências',
    isActive: true,
    position: 0,
  });

  for (const [index, amount] of [10000, 10100, 9900].entries()) {
    await create(request, '/api/transactions', {
      accountId: account.id,
      categoryId: category.id,
      amount,
      description,
      ...monthAt(index - 3),
      status: 'COMPLETED',
      type: 'EXPENSE',
    });
  }

  const beforeResponse = await request.get('/api/recurrences');
  const before = (await beforeResponse.json()).data;
  expect(before.formal).toHaveLength(0);
  expect(before.candidates).toHaveLength(1);
  expect(before.candidates[0]).toMatchObject({
    description,
    frequency: 'MONTHLY',
    interval: 1,
    variableAmount: true,
    occurrenceCount: 3,
  });

  const state = await request.storageState();
  await page.context().addCookies(state.cookies);
  await page.goto('/recorrencias');

  await expect(page.getByRole('heading', { name: 'Recorrências e assinaturas', exact: true })).toBeVisible();
  const card = page.locator('article').filter({ hasText: description }).first();
  await expect(card).toContainText('valor variável');

  await page.setViewportSize({ width: 320, height: 760 });
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

  await page.setViewportSize({ width: 1280, height: 800 });
  await card.getByRole('button', { name: 'Confirmar recorrência', exact: true }).click();

  const formalCard = page.locator('article').filter({ hasText: description }).first();
  await expect(formalCard).toContainText('Recorrência cadastrada');
  await expect(formalCard.getByRole('link', { name: 'Editar próxima ocorrência', exact: true })).toBeVisible();

  const afterResponse = await request.get('/api/recurrences');
  const after = (await afterResponse.json()).data;
  expect(after.formal).toHaveLength(1);
  expect(after.candidates).toHaveLength(0);
  expect(after.formal[0]).toMatchObject({
    description,
    frequency: 'MONTHLY',
    interval: 1,
    amount: 10000,
    currency: 'BRL',
  });
});

test('recorrências: ignorar candidato não persiste série', async ({ page, request }) => {
  const suffix = `${Date.now()}-ignore-${test.info().project.name}`;
  const email = `qa-recurrence-ignore-${suffix}@example.test`;
  const description = `Academia E2E ${suffix}`;

  await request.post('/api/auth/signup', {
    data: { name: 'QA Recorrências Ignore', email, password },
  });
  await request.post('/api/auth/login', {
    data: { email, password },
  });

  const account = await create(request, '/api/accounts', {
    name: `Conta Ignore ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    isActive: true,
  });
  const category = await create(request, '/api/categories', {
    name: `Categoria Ignore ${suffix}`,
    type: 'EXPENSE',
    color: '#EF4444',
    icon: 'tag',
    isActive: true,
    position: 0,
  });

  for (let index = 0; index < 3; index += 1) {
    await create(request, '/api/transactions', {
      accountId: account.id,
      categoryId: category.id,
      amount: 15000,
      description,
      ...monthAt(index - 3),
      status: 'COMPLETED',
      type: 'EXPENSE',
    });
  }

  const state = await request.storageState();
  await page.context().addCookies(state.cookies);
  await page.goto('/recorrencias');

  const card = page.locator('article').filter({ hasText: description }).first();
  await card.getByRole('button', { name: 'Ignorar', exact: true }).click();
  await expect(card).toBeHidden();

  const response = await request.get('/api/recurrences');
  const data = (await response.json()).data;
  expect(data.formal).toHaveLength(0);
  expect(data.candidates).toHaveLength(1);
});
