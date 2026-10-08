import { expect, request as apiRequest, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

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

function candidateCard(page, description) {
  return page
    .locator('section[aria-labelledby="candidate-recurrences-title"]')
    .locator('article')
    .filter({ hasText: description })
    .first();
}

function formalRecurrenceCard(page, description) {
  return page
    .locator('section[aria-labelledby="formal-recurrences-title"]')
    .locator('article')
    .filter({ hasText: description })
    .first();
}

test('recorrências: candidato exige confirmação antes de virar série formal', async ({ page, request }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-recurrence-${suffix}@example.test`;
  const description = `Streaming E2E ${suffix}`;

  await createVerifiedUser({ name: 'QA Recorrências', email, password });

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
  const card = candidateCard(page, description);
  await expect(card).toContainText('valor variável');

  await page.setViewportSize({ width: 320, height: 760 });
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

  await page.setViewportSize({ width: 1280, height: 800 });
  await card.getByRole('button', { name: 'Confirmar recorrência', exact: true }).click();

  const formalCard = formalRecurrenceCard(page, description);
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

  const editButton = formalCard.getByRole('button', { name: 'Editar série', exact: true });
  await editButton.click();
  const dialog = page.getByRole('dialog', { name: 'Editar série', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Descrição', { exact: true })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(editButton).toBeFocused();

  await editButton.click();
  await expect(dialog).toBeVisible();

  const updatedDescription = `Streaming atualizado E2E ${suffix}`;
  await dialog.getByLabel('Descrição', { exact: true }).fill(updatedDescription);
  await dialog.getByLabel('Valor (BRL)', { exact: true }).fill('123,45');
  await dialog.getByRole('button', { name: 'Salvar série', exact: true }).click();

  await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();

  const editedResponse = await request.get('/api/recurrences');
  const edited = (await editedResponse.json()).data;
  expect(edited.formal[0]).toMatchObject({
    description: updatedDescription,
    amount: 12345,
  });
  expect(edited.formal[0].remainingOccurrences).toBeGreaterThan(0);

  page.once('dialog', (confirmation) => confirmation.accept());
  const updatedCard = formalRecurrenceCard(page, updatedDescription);
  await updatedCard.getByRole('button', { name: 'Encerrar recorrência', exact: true }).click();
  await expect(updatedCard).toBeHidden();

  const endedResponse = await request.get('/api/recurrences');
  const ended = (await endedResponse.json()).data;
  expect(ended.formal).toHaveLength(0);
  expect(ended.candidates).toHaveLength(0);
});

test('recorrências: ignorar candidato não persiste série', async ({ page, request }) => {
  const suffix = `${Date.now()}-ignore-${test.info().project.name}`;
  const email = `qa-recurrence-ignore-${suffix}@example.test`;
  const description = `Academia E2E ${suffix}`;

  await createVerifiedUser({ name: 'QA Recorrências Ignore', email, password });
  await request.post('/api/auth/login', {
    data: { email, password },
  });

  const account = await create(request, '/api/accounts', {
    name: `Conta Ignore ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    description: null,
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

  const card = candidateCard(page, description);
  await card.getByRole('button', { name: 'Ignorar agora', exact: true }).click();
  await expect(card).toBeHidden();

  const response = await request.get('/api/recurrences');
  const data = (await response.json()).data;
  expect(data.formal).toHaveLength(0);
  expect(data.candidates).toHaveLength(1);
});


test('recorrências: não sugerir novamente persiste no servidor', async ({ page, request }) => {
  const suffix = `${Date.now()}-suppress-${test.info().project.name}`;
  const email = `qa-recurrence-suppress-${suffix}@example.test`;
  const description = `Clube E2E ${suffix}`;

  await createVerifiedUser({ name: 'QA Recorrências Suppress', email, password });
  await request.post('/api/auth/login', {
    data: { email, password },
  });

  const account = await create(request, '/api/accounts', {
    name: `Conta Suppress ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    description: null,
    isActive: true,
  });
  const category = await create(request, '/api/categories', {
    name: `Categoria Suppress ${suffix}`,
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
      amount: 17000,
      description,
      ...monthAt(index - 3),
      status: 'COMPLETED',
      type: 'EXPENSE',
    });
  }

  const state = await request.storageState();
  await page.context().addCookies(state.cookies);
  await page.goto('/recorrencias');

  const card = candidateCard(page, description);
  await card.getByRole('button', { name: 'Não sugerir novamente', exact: true }).click();
  await expect(card).toBeHidden();

  await page.reload();
  await expect(candidateCard(page, description)).toHaveCount(0);

  const response = await request.get('/api/recurrences');
  const data = (await response.json()).data;
  expect(data.formal).toHaveLength(0);
  expect(data.candidates).toHaveLength(0);
});


test('recorrências: transferências repetidas não viram candidatos', async ({ request }) => {
  const suffix = `${Date.now()}-transfer-${test.info().project.name}`;
  const email = `qa-recurrence-transfer-${suffix}@example.test`;

  await createVerifiedUser({ name: 'QA Recorrências Transfer', email, password });
  const login = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok(), `login: ${login.status()}`).toBeTruthy();

  const source = await create(request, '/api/accounts', {
    name: `Origem Transfer ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#2563EB',
    icon: 'wallet',
    description: null,
    isActive: true,
  });
  const destination = await create(request, '/api/accounts', {
    name: `Destino Transfer ${suffix}`,
    type: 'CREDIT_DEBIT',
    currency: 'BRL',
    color: '#16A34A',
    icon: 'wallet',
    description: null,
    isActive: true,
  });

  for (let index = 0; index < 3; index += 1) {
    const response = await request.post('/api/transfers', {
      headers: { 'Idempotency-Key': `recurrence-transfer-${suffix}-${index}` },
      data: {
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amountCents: 50000,
        description: `Transferência recorrente ${suffix}`,
        ...monthAt(index - 3),
        status: 'COMPLETED',
      },
    });
    expect(response.ok()).toBeTruthy();
  }

  const response = await request.get('/api/recurrences');
  const data = (await response.json()).data;
  expect(data.formal).toHaveLength(0);
  expect(data.candidates).toHaveLength(0);
});

test('recorrências: ownership impede leitura e edição de série alheia', async () => {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('baseURL do Playwright é obrigatório');

  const suffix = `${Date.now()}-ownership-${test.info().project.name}`;
  // A suíte compartilha IP no CI: isolar os contextos evita 429 sem alterar
  // a proteção da API e mantém sessões/cookies independentes.
  const ipSeed = [...suffix].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100, 0);
  const owner = await apiRequest.newContext({
    baseURL, extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${100 + ipSeed}` },
  });
  const stranger = await apiRequest.newContext({
    baseURL, extraHTTPHeaders: { 'x-forwarded-for': `198.51.100.${200 + (ipSeed % 50)}` },
  });

  try {
    const ownerEmail = `qa-recurrence-owner-${suffix}@example.test`;
    await createVerifiedUser({ name: 'QA Recurrence Owner', email: ownerEmail, password });
    const ownerLogin = await owner.post('/api/auth/login', {
      data: { email: ownerEmail, password },
    });
    expect(ownerLogin.ok(), JSON.stringify(await ownerLogin.json())).toBeTruthy();

    const account = await create(owner, '/api/accounts', {
      name: `Owner Account ${suffix}`,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#2563EB',
      icon: 'wallet',
      description: null,
      isActive: true,
    });
    const category = await create(owner, '/api/categories', {
      name: `Owner Category ${suffix}`,
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      isActive: true,
      position: 0,
    });

    const start = monthAt(1);
    const created = await owner.post('/api/transactions/recurring/flexible', {
      headers: { 'Idempotency-Key': `ownership-series-${suffix}` },
      data: {
        transaction: {
          accountId: account.id,
          categoryId: category.id,
          amount: 25000,
          description: `Série privada ${suffix}`,
          ...start,
          status: 'PENDING',
          type: 'EXPENSE',
        },
        recurrence: {
          frequency: 'MONTHLY',
          interval: 1,
          mode: 'count',
          occurrences: 3,
        },
      },
    });
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const seriesId = createdBody.data.series.id;

    const strangerEmail = `qa-recurrence-stranger-${suffix}@example.test`;
    await createVerifiedUser({ name: 'QA Recurrence Stranger', email: strangerEmail, password });
    const strangerLogin = await stranger.post('/api/auth/login', {
      data: { email: strangerEmail, password },
    });
    expect(strangerLogin.ok(), JSON.stringify(await strangerLogin.json())).toBeTruthy();

    const strangerList = await stranger.get('/api/recurrences');
    expect(strangerList.ok(), JSON.stringify(await strangerList.json())).toBeTruthy();
    const strangerData = (await strangerList.json()).data;
    expect(strangerData.formal).toHaveLength(0);

    const forbiddenUpdate = await stranger.patch(`/api/recurrences/${seriesId}`, {
      data: { description: 'Alteração indevida', amount: 100 },
    });
    expect(forbiddenUpdate.status()).toBe(404);

    const forbiddenEnd = await stranger.delete(`/api/recurrences/${seriesId}`);
    expect(forbiddenEnd.status()).toBe(404);

    const ownerList = await owner.get('/api/recurrences');
    expect(ownerList.ok(), JSON.stringify(await ownerList.json())).toBeTruthy();
    const ownerData = (await ownerList.json()).data;
    expect(ownerData.formal).toHaveLength(1);
    expect(ownerData.formal[0].description).toBe(`Série privada ${suffix}`);
  } finally {
    await owner.dispose();
    await stranger.dispose();
  }
});
