import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('metas: criar, contribuir e concluir sem criar transação financeira', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-goal-${suffix}@example.test`;
  const goalName = `Reserva E2E ${suffix}`;

  const signup = await request.post('/api/auth/signup', {
    data: {
      name: 'QA Metas',
      email,
      password,
    },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/metas');
  await expect(page.getByRole('heading', { name: 'Metas', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Nova meta', exact: true }).click();

  const createDialog = page.getByRole('dialog', { name: 'Nova meta', exact: true });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel('Nome', { exact: true }).fill(goalName);
  await createDialog.getByLabel('Valor alvo', { exact: true }).fill('1000,00');
  await createDialog.getByRole('button', { name: 'Criar meta', exact: true }).click();

  await expect(createDialog).toBeHidden();
  const goalCard = page.locator('article').filter({ hasText: goalName }).first();
  await expect(goalCard).toBeVisible();
  await expect(goalCard).toContainText('R$ 0,00');
  await expect(goalCard).toContainText('R$ 1.000,00');

  await goalCard.getByRole('button', { name: 'Contribuir', exact: true }).click();

  const contributionDialog = page.getByRole('dialog', {
    name: 'Contribuir para meta',
    exact: true,
  });
  await expect(contributionDialog).toBeVisible();
  await contributionDialog
    .getByLabel('Valor da contribuição', { exact: true })
    .fill('1000,00');
  await contributionDialog
    .getByLabel('Descrição opcional', { exact: true })
    .fill('Conclusão E2E');
  await contributionDialog
    .getByRole('button', { name: 'Registrar contribuição', exact: true })
    .click();

  await expect(contributionDialog).toBeHidden();
  await expect(goalCard).toContainText('Concluída');
  await expect(goalCard).toContainText('100%');

  const state = await page.evaluate(async (name) => {
    const [goalsResponse, transactionsResponse] = await Promise.all([
      fetch('/api/goals'),
      fetch('/api/transactions?page=1&pageSize=20'),
    ]);
    const goalsBody = await goalsResponse.json();
    const transactionsBody = await transactionsResponse.json();

    if (!goalsResponse.ok || !transactionsResponse.ok) {
      throw new Error(
        `validation failed: goals=${goalsResponse.status}, transactions=${transactionsResponse.status}`,
      );
    }

    const goal = goalsBody.data.items.find((item) => item.name === name);
    return {
      goal,
      transactionTotal: transactionsBody.data.total,
    };
  }, goalName);

  expect(state.goal).toMatchObject({
    name: goalName,
    targetAmount: 100000,
    currentAmount: 100000,
    remainingAmount: 0,
    percentage: 100,
    status: 'COMPLETED',
  });
  expect(state.transactionTotal).toBe(0);
});
