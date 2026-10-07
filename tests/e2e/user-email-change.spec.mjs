import { expect, test } from '@playwright/test';
import jwt from 'jsonwebtoken';

import { createVerifiedUser } from './support/verified-user.mjs';

const currentPassword = 'Playwright123!';

function emailChangeToken({ userId, email }) {
  return jwt.sign(
    {
      sub: userId,
      purpose: 'email-verification',
      email,
      kind: 'email-change',
      authVersion: 0,
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: 'controle-gastos-auth',
      audience: 'controle-gastos-email-verification',
    },
  );
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(currentPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('troca de e-mail aguarda confirmação e exige novo login', async ({ page }) => {
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const currentEmail = `qa-email-current-${suffix}@example.test`;
  const newEmail = `qa-email-new-${suffix}@example.test`;

  await createVerifiedUser({
    name: 'QA Email Change',
    email: currentEmail,
    password: currentPassword,
  });

  await login(page, currentEmail);

  const profile = await page.evaluate(async () => {
    const response = await fetch('/api/user', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`profile load failed with ${response.status}`);
    }
    return response.json();
  });

  let emailChangeRequests = 0;
  let lastPayload = null;

  await page.route('**/api/user', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.continue();
      return;
    }

    emailChangeRequests += 1;
    lastPayload = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: profile.data,
      }),
    });
  });

  await page.goto(`/usuario/alterar/${profile.data.id}`);

  await expect(page.getByText(currentEmail, { exact: true })).toBeVisible();
  await page.getByLabel('Novo e-mail', { exact: true }).fill(newEmail);
  await page.getByLabel('Senha atual', { exact: true }).fill(currentPassword);
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Aguardando confirmação' }),
  ).toContainText(newEmail);
  expect(emailChangeRequests).toBe(1);
  expect(lastPayload).toMatchObject({
    email: newEmail,
    currentPassword,
  });

  await page.getByLabel('Senha atual', { exact: true }).fill(currentPassword);
  await page.getByRole('button', { name: 'Reenviar confirmação', exact: true }).click();
  await expect.poll(() => emailChangeRequests).toBe(2);

  const token = emailChangeToken({
    userId: profile.data.id,
    email: newEmail,
  });

  await page.goto(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);

  await expect(page).toHaveURL(/\/login\?verification=email-changed$/);
  await expect(
    page.getByRole('status').filter({
      hasText: 'E-mail alterado com sucesso. Entre novamente com o novo endereço.',
    }),
  ).toBeVisible();

  const oldSessionStatus = await page.evaluate(async () => {
    const response = await fetch('/api/user', { cache: 'no-store' });
    return response.status;
  });
  expect(oldSessionStatus).toBe(401);

  await page.getByLabel(/^E-mail\b/).fill(newEmail);
  await page.getByLabel(/^Senha\b/).fill(currentPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
