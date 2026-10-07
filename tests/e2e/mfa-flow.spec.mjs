import { expect, test } from '@playwright/test';

import { currentTotp, waitForNextTotpStep } from './helpers/totp.mjs';
import { setIsolatedClientIp } from './support/client-ip.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function loginWithPassword(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function logout(page) {
  await page
    .getByRole('button', { name: 'Sair da conta', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/$/);
}

test('2FA activation, recovery regeneration, recovery/TOTP login and strong disable', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const email = `mfa-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await createVerifiedUser({
    name: 'QA MFA',
    email,
    password,
  });

  await loginWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();

  const mfaHeading = page.getByRole('heading', {
    name: 'Autenticação em duas etapas',
  });
  const mfaSection = page.locator('section').filter({ has: mfaHeading });

  await expect(
    mfaSection.getByText('Desativado', { exact: true }),
  ).toBeVisible();

  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection
    .getByRole('button', { name: 'Configurar 2FA' })
    .click();

  const manualKey = mfaSection
    .getByText('Chave manual', { exact: true })
    .locator('..');
  const secret = (await manualKey.locator('code').textContent())?.trim();
  expect(secret).toBeTruthy();

  const enrollmentTotp = currentTotp(secret);
  await mfaSection
    .getByLabel('Código de 6 dígitos')
    .fill(enrollmentTotp.token);
  await mfaSection
    .getByRole('button', { name: 'Confirmar e ativar' })
    .click();

  const initialRecoveryPanel = mfaSection
    .getByText('Códigos de recuperação', { exact: true })
    .locator('..');
  await expect(initialRecoveryPanel).toBeVisible();

  const oldRecoveryCodes = await initialRecoveryPanel
    .locator('code')
    .allTextContents();
  expect(oldRecoveryCodes).toHaveLength(10);

  await initialRecoveryPanel
    .getByRole('button', { name: 'Já guardei' })
    .click();

  await expect(
    mfaSection.getByText('2FA está ativo para sua conta.', { exact: true }),
  ).toBeVisible();
  await expect(
    mfaSection.getByText(/10 código\(s\) ainda disponível\(is\)/),
  ).toBeVisible();

  await mfaSection
    .getByRole('button', { name: 'Regenerar códigos', exact: true })
    .click();
  await mfaSection
    .getByLabel('Senha atual para regenerar códigos')
    .fill(password);
  await mfaSection
    .getByRole('button', { name: 'Usar recovery code para regenerar' })
    .click();
  await mfaSection
    .getByLabel('Código de recuperação para regenerar')
    .fill(oldRecoveryCodes[0]);
  await mfaSection
    .getByRole('button', { name: 'Regenerar códigos', exact: true })
    .click();

  const regeneratedPanel = mfaSection
    .getByText('Novos códigos de recuperação', { exact: true })
    .locator('..');
  await expect(regeneratedPanel).toBeVisible();

  const newRecoveryCodes = await regeneratedPanel
    .locator('code')
    .allTextContents();
  expect(newRecoveryCodes).toHaveLength(10);
  expect(newRecoveryCodes).not.toEqual(oldRecoveryCodes);

  await regeneratedPanel
    .getByRole('button', { name: 'Já guardei os novos códigos' })
    .click();

  await logout(page);
  await loginWithPassword(page, email);
  await expect(
    page.getByRole('heading', { name: 'Confirme que é você' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Usar código de recuperação' })
    .click();
  await page
    .getByLabel('Código de recuperação')
    .fill(oldRecoveryCodes[1]);
  await page
    .getByRole('button', { name: 'Confirmar e entrar' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Confirme que é você' }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard$/);

  await loginWithPassword(page, email);
  await page
    .getByRole('button', { name: 'Usar código de recuperação' })
    .click();
  await page
    .getByLabel('Código de recuperação')
    .fill(newRecoveryCodes[0]);
  await page
    .getByRole('button', { name: 'Confirmar e entrar' })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  await waitForNextTotpStep(enrollmentTotp.step);
  await loginWithPassword(page, email);
  await page
    .getByLabel('Código de 6 dígitos')
    .fill(currentTotp(secret).token);
  await page
    .getByRole('button', { name: 'Confirmar e entrar' })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();
  await mfaSection
    .getByRole('button', { name: 'Desativar 2FA' })
    .click();
  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection
    .getByRole('button', { name: 'Usar código de recuperação' })
    .click();
  await mfaSection
    .getByLabel('Código de recuperação')
    .fill(newRecoveryCodes[1]);
  await mfaSection
    .getByRole('button', { name: 'Desativar 2FA' })
    .click();

  await expect(
    mfaSection.getByText(
      'Adicione um segundo fator usando um aplicativo autenticador.',
    ),
  ).toBeVisible();

  await logout(page);
  await loginWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
});
