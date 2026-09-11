import crypto from 'node:crypto';

import { expect, test } from '@playwright/test';

const password = 'Playwright123!';
const periodSeconds = 30;

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error(`Invalid Base32 character: ${character}`);
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }

  return Buffer.from(bytes);
}

function totp(secret, now = Date.now()) {
  const step = Math.floor(now / 1000 / periodSeconds);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return {
    step,
    token: String(binary % 1_000_000).padStart(6, '0'),
  };
}

async function waitForNextStep(previousStep) {
  const current = Math.floor(Date.now() / 1000 / periodSeconds);
  if (current > previousStep) return;

  const nextBoundaryMs = (previousStep + 1) * periodSeconds * 1000;
  const waitMs = Math.max(250, nextBoundaryMs - Date.now() + 500);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

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
  await expect(page.getByText('2FA desativado', { exact: false })).toBeVisible();

  const mfaSection = page.getByRole('heading', { name: 'Autenticação em duas etapas' }).locator('..').locator('..').locator('..');
  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection.getByRole('button', { name: 'Configurar 2FA' }).click();

  const manualKeyContainer = page.getByText('Chave manual', { exact: true }).locator('..');
  const secret = (await manualKeyContainer.locator('code').textContent())?.trim();
  expect(secret).toBeTruthy();

  const enrollmentTotp = totp(secret);
  await mfaSection.getByLabel('Código de 6 dígitos').fill(enrollmentTotp.token);
  await mfaSection.getByRole('button', { name: 'Confirmar e ativar' }).click();

  const recoveryPanel = page.getByText('Códigos de recuperação', { exact: true }).locator('..');
  await expect(recoveryPanel).toBeVisible();
  const recoveryCodes = await recoveryPanel.locator('code').allTextContents();
  expect(recoveryCodes.length).toBeGreaterThanOrEqual(2);
  await recoveryPanel.getByRole('button', { name: 'Já guardei' }).click();
  await expect(page.getByText('2FA está ativo para sua conta.', { exact: true })).toBeVisible();

  await logout(page);

  await loginWithPassword(page, email);
  await expect(page.getByRole('heading', { name: 'Confirme que é você' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar código de recuperação' }).click();
  await page.getByLabel('Código de recuperação').fill(recoveryCodes[0]);
  await page.getByRole('button', { name: 'Confirmar e entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  await waitForNextStep(enrollmentTotp.step);

  await loginWithPassword(page, email);
  await expect(page.getByRole('heading', { name: 'Confirme que é você' })).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill(totp(secret).token);
  await page.getByRole('button', { name: 'Confirmar e entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/usuario/${userId}`);
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();
  await page.getByRole('button', { name: 'Desativar 2FA' }).click();
  await mfaSection.getByLabel('Senha atual').fill(password);
  await mfaSection.getByRole('button', { name: 'Usar código de recuperação' }).click();
  await mfaSection.getByLabel('Código de recuperação').fill(recoveryCodes[1]);
  await mfaSection.getByRole('button', { name: 'Desativar 2FA' }).click();
  await expect(page.getByText('Adicione um segundo fator usando um aplicativo autenticador.')).toBeVisible();

  await logout(page);
  await loginWithPassword(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
});
