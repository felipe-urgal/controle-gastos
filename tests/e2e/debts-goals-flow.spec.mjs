import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function signup(request, prefix) {
  const suffix = `${Date.now()}-${test.info().project.name}-${prefix}`;
  const email = `qa-${prefix}-${suffix}@example.test`;
  await createVerifiedUser({
      name: `QA ${prefix}`,
      email,
      password,
    });
  return { email, suffix };
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('dívidas e metas são protegidas antes do client-side guard', async ({ page }) => {
  for (const route of ['/dividas', '/metas']) {
    await page.context().clearCookies();
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('dívidas: parcela avança cronograma sem criar transação financeira', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { email, suffix } = await signup(request, 'debt');
  const debtName = `Financiamento E2E ${suffix}`;

  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dividas');

  await page.getByRole('button', { name: 'Nova dívida', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: 'Nova dívida', exact: true });
  await expect(createDialog).toBeVisible();
  await expect(createDialog).toBeFocused();

  await createDialog.getByLabel('Nome', { exact: true }).fill(debtName);
  await createDialog.getByLabel('Saldo devedor', { exact: true }).fill('200,00');
  await createDialog
    .getByLabel('Valor da parcela opcional', { exact: true })
    .fill('100,00');
  await createDialog.getByLabel('Próximo vencimento', { exact: true }).fill('2030-01-10');
  await createDialog.getByLabel('Parcelas restantes', { exact: true }).fill('2');
  await createDialog.getByRole('button', { name: 'Criar dívida', exact: true }).click();
  await expect(createDialog).toBeHidden();

  const debtCard = page.locator('article').filter({ hasText: debtName }).first();
  await expect(debtCard).toBeVisible();
  await expect(debtCard).toContainText('R$\u00a0200,00');
  await expect(debtCard).toContainText('10/01/2030');

  const paymentButton = debtCard.getByRole('button', {
    name: 'Registrar pagamento',
    exact: true,
  });
  await paymentButton.click();

  const paymentDialog = page.getByRole('dialog', {
    name: 'Registrar pagamento da parcela',
    exact: true,
  });
  await expect(paymentDialog).toBeVisible();
  await expect(paymentDialog).toBeFocused();
  await paymentDialog.getByLabel('Valor pago', { exact: true }).fill('100,00');
  await paymentDialog
    .getByLabel('Descrição opcional', { exact: true })
    .fill('Parcela E2E');
  await paymentDialog
    .getByRole('button', { name: 'Registrar pagamento', exact: true })
    .click();

  await expect(paymentDialog).toBeHidden();
  await expect(debtCard).toContainText('R$\u00a0100,00');
  await expect(debtCard).toContainText('10/02/2030');
  await expect(debtCard).toContainText('1 parcela restante');

  await debtCard.getByRole('button', { name: 'Histórico', exact: true }).click();
  const historyDialog = page
    .getByRole('dialog')
    .filter({ hasText: debtName })
    .first();
  await expect(historyDialog).toBeVisible();
  await expect(historyDialog).toContainText('Pagamento');
  await expect(historyDialog).toContainText('Parcela E2E');
  await page.keyboard.press('Escape');
  await expect(historyDialog).toBeHidden();

  const transactionTotal = await page.evaluate(async () => {
    const response = await fetch('/api/transactions?page=1&pageSize=20');
    const body = await response.json();
    if (!response.ok) throw new Error(`transactions failed: ${response.status}`);
    return body.data.total;
  });
  expect(transactionTotal).toBe(0);
});

test('metas continuam utilizáveis quando contas estão indisponíveis', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { email, suffix } = await signup(request, 'goal-partial');
  const goalName = `Meta parcial E2E ${suffix}`;

  await login(page, email);
  await page.route('**/api/accounts**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'accounts unavailable for e2e',
      }),
    });
  });

  await page.goto('/metas');
  await expect(page.getByRole('heading', { name: 'Metas', exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Metas continuam disponíveis, mas o vínculo opcional com contas está temporariamente indisponível.',
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Nova meta', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova meta', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Conta de referência opcional', { exact: true })).toBeDisabled();
  await dialog.getByLabel('Nome', { exact: true }).fill(goalName);
  await dialog.getByLabel('Valor alvo', { exact: true }).fill('500,00');
  await dialog.getByRole('button', { name: 'Criar meta', exact: true }).click();
  await expect(dialog).toBeHidden();

  const card = page.locator('article').filter({ hasText: goalName }).first();
  await expect(card).toBeVisible();
  await card
    .getByRole('button', { name: 'Excluir meta sem histórico', exact: true })
    .click();

  const confirm = page.getByRole('dialog', { name: 'Excluir meta?', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(card).toBeHidden();
});
