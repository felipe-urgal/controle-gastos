import { expect, test } from '@playwright/test';

import { currentTotp } from './helpers/totp.mjs';
import { setIsolatedClientIp } from './support/client-ip.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openDeleteDialog(page) {
  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Risco', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir minha conta', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Excluir sua conta' })).toBeVisible();
}

async function expectDeletedCredentialsRejected(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/login(\?next=[^#]*)?$/);
  await expect(page.getByText(/E-mail ou senha inválidos/i)).toBeVisible();
}

test('exclusão de conta sem MFA exige senha atual e invalida o login', async ({ page }) => {
  const email = `delete-no-mfa-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await createVerifiedUser({
    name: 'QA Delete sem MFA',
    email,
    password,
  });

  await login(page, email);
  await openDeleteDialog(page);

  await page.getByRole('dialog', { name: 'Excluir sua conta' }).getByLabel('Senha atual').fill(password);
  await page.getByRole('dialog', { name: 'Excluir sua conta' }).getByRole('button', { name: 'Excluir conta', exact: true }).click();

  await expect(page).toHaveURL(/\/login(\?next=[^#]*)?$/);
  await expectDeletedCredentialsRejected(page, email);
});

test('exclusão de conta com MFA exige segundo fator e aceita recovery code', async ({ page }) => {
  test.setTimeout(90_000);

  const email = `delete-mfa-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await createVerifiedUser({
    name: 'QA Delete MFA',
    email,
    password,
  });

  await login(page, email);
  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();

  const mfaHeading = page.getByRole('heading', {
    name: 'Autenticação em duas etapas',
  });
  const mfaSection = page.locator('section').filter({ has: mfaHeading });

  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection.getByRole('button', { name: 'Configurar 2FA' }).click();

  const manualKey = mfaSection
    .getByText('Chave manual', { exact: true })
    .locator('..');
  const secret = (await manualKey.locator('code').textContent())?.trim();
  expect(secret).toBeTruthy();

  await mfaSection
    .getByLabel('Código de 6 dígitos')
    .fill(currentTotp(secret).token);
  await mfaSection
    .getByRole('button', { name: 'Confirmar e ativar' })
    .click();

  await expect(mfaSection.locator('code')).toHaveCount(10);
  const recoveryCodes = await mfaSection.locator('code').allTextContents();
  expect(recoveryCodes).toHaveLength(10);

  await mfaSection.getByRole('button', { name: 'Já guardei' }).click();

  await openDeleteDialog(page);
  const dialog = page.getByRole('dialog', { name: 'Excluir sua conta' });
  await dialog.getByLabel('Senha atual').fill(password);
  await dialog.getByLabel('Recovery code').fill(recoveryCodes[0]);
  await dialog.getByRole('button', { name: 'Excluir conta', exact: true }).click();

  await expect(page).toHaveURL(/\/login(\?next=[^#]*)?$/);
  await expectDeletedCredentialsRejected(page, email);
});
