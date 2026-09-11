import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

async function createAccount(page, name) {
  return page.evaluate(async (accountName) => {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: accountName, type: 'CREDIT_DEBIT', currency: 'BRL', color: '#7C3AED', icon: 'wallet', description: null, isActive: true }),
    });
    return (await response.json()).data;
  }, name);
}

async function evidence(page, name) {
  await mkdir('qa-evidence', { recursive: true });
  await page.screenshot({ path: `qa-evidence/${test.info().project.name}-${name}.png`, fullPage: true });
}

async function noOverflow(page) {
  const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(size[0]).toBeLessThanOrEqual(size[1]);
}

test('QA #284 final', async ({ page, request }) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa284-${suffix}@example.test`;
  const sourceName = `Origem ${suffix}`;
  const destinationName = `Destino ${suffix}`;
  const description = `Transferência ${suffix}`;
  const pendingDescription = `Transferência pendente ${suffix}`;

  expect((await request.post('/api/auth/signup', { data: { name: 'QA 284', email, password } })).ok()).toBeTruthy();
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const source = await createAccount(page, sourceName);
  const destination = await createAccount(page, destinationName);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/transacoes/nova');
  const normalMode = page.getByRole('button', { name: 'Receita / Despesa', exact: true });
  const transferMode = page.getByRole('button', { name: 'Transferência', exact: true });
  await normalMode.focus();
  await page.keyboard.press('Tab');
  await expect(transferMode).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(transferMode).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('combobox', { name: 'Conta de origem', exact: true }).selectOption(source.id);
  await page.getByRole('combobox', { name: 'Conta de destino', exact: true }).selectOption(destination.id);
  await page.getByRole('textbox', { name: 'Valor', exact: true }).fill('12345');
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill(description);
  const logicalDate = await page.locator('input[type="date"]').inputValue();
  const [year, month, day] = logicalDate.split('-').map(Number);
  expect(year).toBeGreaterThan(2000);
  expect(month).toBeGreaterThanOrEqual(1);
  expect(day).toBeGreaterThanOrEqual(1);
  await noOverflow(page);
  await evidence(page, 'desktop-compose');

  const reviewButton = page.getByRole('button', { name: 'Revisar e transferir', exact: true });
  await reviewButton.click();
  const dialog = page.getByRole('dialog', { name: 'Revisar transferência', exact: true });
  await expect(dialog).toBeFocused();
  await expect(dialog).toContainText('R$ 123,45');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Voltar', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirmar transferência', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(reviewButton).toBeFocused();
  await reviewButton.click();
  await evidence(page, 'desktop-review');
  await dialog.getByRole('button', { name: 'Confirmar transferência', exact: true }).click();
  await expect(page).toHaveURL(/\/transacoes$/);

  await page.getByRole('tab', { name: 'Histórico', exact: true }).click();
  const sourceRow = page.getByRole('button').filter({ hasText: description }).filter({ hasText: `Para ${destinationName}` });
  const destinationRow = page.getByRole('button').filter({ hasText: description }).filter({ hasText: `De ${sourceName}` });
  await expect(sourceRow).toHaveCount(1);
  await expect(destinationRow).toHaveCount(1);
  await expect(page.getByText('Sem categoria', { exact: true })).toHaveCount(0);
  const detail = page.getByRole('complementary', { name: 'Detalhe da transação selecionada' });
  await expect(detail.getByText(/Transferência (enviada|recebida)/).first()).toBeVisible();
  await expect(detail.getByText('Contraparte', { exact: true })).toBeVisible();
  await evidence(page, 'desktop-history');

  const pendingCreated = await page.evaluate(async ({ sourceId, destinationId, text, key, transferYear, transferMonth, transferDay }) => {
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ sourceAccountId: sourceId, destinationAccountId: destinationId, amountCents: 5000, year: transferYear, month: transferMonth, day: transferDay, description: text, status: 'PENDING' }),
    });
    return response.ok;
  }, {
    sourceId: source.id,
    destinationId: destination.id,
    text: pendingDescription,
    key: `qa284-${suffix}`,
    transferYear: year,
    transferMonth: month,
    transferDay: day,
  });
  expect(pendingCreated).toBeTruthy();

  await page.goto('/transacoes');
  await expect(page.getByText(pendingDescription, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Concluir', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await noOverflow(page);
  await evidence(page, 'mobile-inbox');

  await page.goto('/calendario');
  await noOverflow(page);
  const todayButton = page.getByRole('button', { name: /Hoje\..*pernas de transferência/ });
  await expect(todayButton).toBeVisible();
  await todayButton.click();
  await expect(page.getByText(pendingDescription, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`(De ${sourceName}|Para ${destinationName})`)).first()).toBeVisible();
  await evidence(page, 'mobile-calendar');

  expect(await page.evaluate(async () => (await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showValues: false }) })).ok)).toBeTruthy();
  await page.goto('/transacoes');
  await page.getByRole('tab', { name: 'Histórico', exact: true }).click();
  await expect(page.getByText('••••', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('R$ 123,45', { exact: true })).toHaveCount(0);
  await noOverflow(page);
  await evidence(page, 'mobile-hidden-values');
});
