import { expect, test } from '@playwright/test';

import { currentTotp, waitForNextTotpStep } from './helpers/totp.mjs';

const password = 'Playwright123!';

async function loginWithPassword(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
}

test('2FA activation, recovery/TOTP login and strong disable', async ({ page, request }) => {
  test.setTimeout(90_000);

  const email = `mfa-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await request.post('/api/auth/signup', {
    data: { name: 'QA MFA', email, password },
  });
  expect(signup.ok()).toBeTruthy();
  const signupBody = await signup.json();
  const userId = signupBody.data.id;

  await loginWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/usuario/${userId}`);
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();
  const mfaHeading = page.getByRole('heading', { name: 'Autenticação em duas etapas' });
  const mfaSection = page.locator('section').filter({ has: mfaHeading });
  await expect(mfaSection.getByText('Desativado', { exact: true })).toBeVisible();

  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection.getByRole('button', { name: 'Configurar 2FA' }).click();
  const manualKey = mfaSection.getByText('Chave manual', { exact: true }).locator('..');
  const secret = (await manualKey.locator('code').textContent())?.trim();
  expect(secret).toBeTruthy();

  const enrollmentTotp = currentTotp(secret);
  await mfaSection.getByLabel('Código de 6 dígitos').fill(enrollmentTotp.token);
  await mfaSection.getByRole('button', { name: 'Confirmar e ativar' }).click();

  const recoveryPanel = mfaSection.getByText('Códigos de recuperação', { exact: true }).locator('..');
  await expect(recoveryPanel).toBeVisible();
  const recoveryCodes = await recoveryPanel.locator('code').allTextContents();
  expect(recoveryCodes.length).toBeGreaterThanOrEqual(2);
  await recoveryPanel.getByRole('button', { name: 'Já guardei' }).click();
  await expect(mfaSection.getByText('2FA está ativo para sua conta.', { exact: true })).toBeVisible();

  await logout(page);
  await loginWithPassword(page, email);
  await expect(page.getByRole('heading', { name: 'Confirme que é você' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar código de recuperação' }).click();
  await page.getByLabel('Código de recuperação').fill(recoveryCodes[0]);
  await page.getByRole('button', { name: 'Confirmar e entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  await waitForNextTotpStep(enrollmentTotp.step);
  await loginWithPassword(page, email);
  await page.getByLabel('Código de 6 dígitos').fill(currentTotp(secret).token);
  await page.getByRole('button', { name: 'Confirmar e entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/usuario/${userId}`);
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();
  await mfaSection.getByRole('button', { name: 'Desativar 2FA' }).click();
  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection.getByRole('button', { name: 'Usar código de recuperação' }).click();
  await mfaSection.getByLabel('Código de recuperação').fill(recoveryCodes[1]);
  await mfaSection.getByRole('button', { name: 'Desativar 2FA' }).click();
  await expect(mfaSection.getByText('Adicione um segundo fator usando um aplicativo autenticador.')).toBeVisible();

  await logout(page);
  await loginWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
});
