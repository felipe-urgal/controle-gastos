import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

const scenarios = [
  {
    preset: 'weekly',
    label: 'Semanal',
    frequency: 'WEEKLY',
    interval: 1,
    start: '2026-12-27',
    expectedLast: '10/01/2027',
  },
  {
    preset: 'biweekly',
    label: 'Quinzenal',
    frequency: 'WEEKLY',
    interval: 2,
    start: '2026-09-01',
    expectedLast: '29/09/2026',
  },
  {
    preset: 'monthly',
    label: 'Mensal',
    frequency: 'MONTHLY',
    interval: 1,
    start: '2027-01-31',
    expectedLast: '31/03/2027',
  },
  {
    preset: 'quarterly',
    label: 'Trimestral',
    frequency: 'MONTHLY',
    interval: 3,
    start: '2027-01-31',
    expectedLast: '31/07/2027',
  },
  {
    preset: 'yearly',
    label: 'Anual',
    frequency: 'YEARLY',
    interval: 1,
    start: '2028-02-29',
    expectedLast: '28/02/2030',
  },
];

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
      color: '#7C3AED',
      icon: 'wallet',
      description: 'Conta isolada do E2E de recorrência',
      isActive: true,
    });

    const createdCategory = await create('/api/categories', {
      name: category,
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: 'Categoria isolada do E2E de recorrência',
      isActive: true,
      position: 0,
    });

    return {
      accountId: createdAccount.id,
      categoryId: createdCategory.id,
    };
  }, { accountName, categoryName });
}

async function expectNoHorizontalOverflow(page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
}

async function saveEvidence(page, name) {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

async function prepareRecurringForm(page, scenario, relations, description) {
  await page.goto('/transacoes/nova');
  await page.getByRole('button', { name: 'Despesa', exact: true }).click();
  await page.getByRole('textbox', { name: 'Valor', exact: true }).fill('12345');
  await page.getByRole('combobox', { name: 'Conta', exact: true }).selectOption(relations.accountId);
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption(relations.categoryId);
  await page.getByLabel('Data', { exact: true }).fill(scenario.start);
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill(description);

  await page.getByText('✦ Adicionar detalhes', { exact: true }).click();
  await page.getByText('Recorrente', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Recorrente', exact: true })).toBeChecked();

  const frequency = page.getByRole('combobox', { name: 'Frequência', exact: true });
  await frequency.selectOption(scenario.preset);
  await page.getByRole('spinbutton', { name: 'Quantidade de ocorrências', exact: true }).fill('3');

  const preview = page.getByRole('status');
  await expect(preview).toContainText(`${scenario.label} · 3 ocorrências`);
  await expect(preview).toContainText(scenario.expectedLast);
  await expect(preview).toContainText('As futuras serão pendentes.');

  return frequency;
}

test('QA #289 final — cinco frequências via Quick Compose e runtime flexível', async ({ page, request }) => {
  test.setTimeout(180_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa289-${suffix}@example.test`;

  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA 289', email, password },
  });
  expect(signup.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const relations = await seedFinancialRelations(page, {
    accountName: `Conta recorrência ${suffix}`,
    categoryName: `Categoria recorrência ${suffix}`,
  });

  for (const [index, scenario] of scenarios.entries()) {
    const mobile = scenario.preset === 'yearly';
    await page.setViewportSize(mobile ? { width: 320, height: 740 } : { width: 1280, height: 800 });

    const description = `Recorrência ${scenario.label} ${suffix}`;
    const frequency = await prepareRecurringForm(page, scenario, relations, description);

    if (scenario.preset === 'weekly') {
      await frequency.focus();
      await expect(frequency).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('radio', { name: 'Quantidade', exact: true })).toBeFocused();
      await saveEvidence(page, 'desktop-recurrence-preview');
    }

    if (mobile) {
      await expectNoHorizontalOverflow(page);
      await saveEvidence(page, 'mobile-recurrence-preview');
    }

    const reviewButton = mobile
      ? page.getByRole('button', { name: 'Criar transação', exact: true })
      : page.getByRole('button', { name: 'Revisar e criar', exact: true });
    await reviewButton.click();

    const dialog = page.getByRole('dialog', { name: 'Revisar transação', exact: true });
    await expect(dialog).toBeFocused();

    const requestPromise = page.waitForRequest((current) =>
      current.url().endsWith('/api/transactions/recurring/flexible') && current.method() === 'POST',
    );
    const responsePromise = page.waitForResponse((current) =>
      current.url().endsWith('/api/transactions/recurring/flexible') && current.request().method() === 'POST',
    );

    await dialog.getByRole('button', { name: 'Criar transação', exact: true }).click();

    const [creationRequest, creationResponse] = await Promise.all([
      requestPromise,
      responsePromise,
    ]);

    expect(creationResponse.ok()).toBeTruthy();

    const payload = creationRequest.postDataJSON();
    expect(payload.recurrence).toEqual({
      frequency: scenario.frequency,
      interval: scenario.interval,
      mode: 'count',
      occurrences: 3,
    });
    expect(payload.transaction.description).toBe(description);

    const body = await creationResponse.json();
    expect(body.data.occurrenceCount).toBe(3);
    expect(body.data.series.frequency).toBe(scenario.frequency);
    expect(body.data.series.interval).toBe(scenario.interval);
    expect(body.data.firstOccurrence.description).toBe(description);
    expect(body.data.firstOccurrence.status).toBe('COMPLETED');

    await expect(page).toHaveURL(/\/transacoes$/);

    const persisted = await page.evaluate(async (transactionId) => {
      const response = await fetch(`/api/transactions/${transactionId}`);
      return {
        ok: response.ok,
        body: await response.json(),
      };
    }, body.data.firstOccurrence.id);

    expect(persisted.ok).toBeTruthy();
    expect(persisted.body.data.series.frequency).toBe(scenario.frequency);
    expect(persisted.body.data.series.interval).toBe(scenario.interval);
    expect(persisted.body.data.series.occurrenceCount).toBe(3);

    if (index < scenarios.length - 1) {
      await page.waitForLoadState('networkidle');
    }
  }
});
