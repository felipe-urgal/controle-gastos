import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

test('preferência: resumo semanal aparece no Dashboard e some no opt-out', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const email = `qa-summary-814-${Date.now()}-${testInfo.project.name}-${testInfo.retry}@example.test`;
  await createVerifiedUser({ name: 'QA Resumo Semanal', email, password });
  await setIsolatedClientIp(page, email);

  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/usuario');
  const toggle = page.getByRole('checkbox', { name: 'Gerar resumo semanal' });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(toggle).toBeChecked();
  await expect(page.getByText('Preferência de resumo semanal atualizada.')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Resumo semanal' })).toBeVisible();
  await expect(page.getByText('Snapshot gerado em')).toBeVisible();
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/periodic-summary?currency=BRL');
    return { status: res.status, body: await res.json() };
  });
  expect(response.status).toBe(200);
  expect(response.body.data.enabled).toBe(true);
  expect(response.body.data.summary.content.currency).toBe('BRL');

  await page.goto('/usuario');
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText('Preferência de resumo semanal atualizada.')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Resumo semanal' })).toHaveCount(0);
});
