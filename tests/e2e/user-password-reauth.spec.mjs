import { expect, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

const currentPassword = 'Playwright123!';
const newPassword = 'Playwright456!';

async function login(page, email, password = currentPassword) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('troca de senha exige novo login e invalida sessões antigas', async ({
  browser,
  page,
  request,
}) => {
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-password-reauth-${suffix}@example.test`;

  await createVerifiedUser({
    name: 'QA Password Reauth',
    email,
    password: currentPassword,
  });

  await login(page, email);

  const secondaryContext = await browser.newContext();
  const secondaryPage = await secondaryContext.newPage();

  try {
    await login(secondaryPage, email);

    const profile = await page.evaluate(async () => {
      const response = await fetch('/api/user', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`profile load failed with ${response.status}`);
      }
      return response.json();
    });

    await page.goto(`/usuario/alterar/${profile.data.id}`);

    await page.getByLabel('Nova senha', { exact: true }).fill(newPassword);
    await page.getByLabel('Senha atual', { exact: true }).fill(currentPassword);
    await page
      .getByLabel('Confirmar nova senha', { exact: true })
      .fill(newPassword);
    await page
      .getByRole('button', { name: 'Salvar alterações', exact: true })
      .click();

    await expect(page).toHaveURL(/\/login\?reason=password-changed$/);
    await expect(
      page.getByRole('status').filter({
        hasText: 'Senha alterada com sucesso. Entre novamente.',
      }),
    ).toBeVisible();

    const oldSessionResponse = await secondaryPage.evaluate(async () => {
      const response = await fetch('/api/user', { cache: 'no-store' });
      return response.status;
    });
    expect(oldSessionResponse).toBe(401);

    const oldPasswordLogin = await request.post('/api/auth/login', {
      data: { email, password: currentPassword },
    });
    expect(oldPasswordLogin.ok()).toBe(false);

    const newPasswordLogin = await request.post('/api/auth/login', {
      data: { email, password: newPassword },
    });
    expect(newPasswordLogin.ok()).toBe(true);
  } finally {
    await secondaryContext.close();
  }
});
