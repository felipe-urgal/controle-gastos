import { expect, test } from '@playwright/test';

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

async function userFixture(label) {
  const suffix = `${Date.now()}-${test.info().project.name}-${label}`;
  const email = `qa-profile-${suffix}@example.test`;

  await createVerifiedUser({
    name: 'QA Profile State',
    email,
    password,
  });

  return { email };
}

test('perfil diferencia erro temporário e permite retry', async ({ page }) => {
  const { email } = await userFixture('retry');
  await login(page, email);

  let profileGets = 0;
  await page.route('**/api/user', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    profileGets += 1;
    if (profileGets === 1) {
      await route.continue();
      return;
    }

    if (profileGets === 2) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'TEST_ERROR', message: 'Falha temporária' },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/usuario');

  await expect(
    page.getByRole('alert').filter({
      hasText: 'Não foi possível carregar seu perfil',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click();

  await expect(
    page.locator('#main-content').getByText(email, { exact: true }),
  ).toBeVisible();
  expect(profileGets).toBeGreaterThanOrEqual(2);
});

test('perfil mostra não encontrado somente para 404 real', async ({ page }) => {
  const { email } = await userFixture('not-found');
  await login(page, email);

  let profileGets = 0;
  await page.route('**/api/user', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    profileGets += 1;
    if (profileGets === 1) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Perfil não encontrado' },
      }),
    });
  });

  await page.goto('/usuario');

  await expect(
    page.getByText('Perfil não encontrado', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente', exact: true }),
  ).toHaveCount(0);
});

test('perfil exige nova autenticação em 401', async ({ page }) => {
  const { email } = await userFixture('unauthorized');
  await login(page, email);

  let profileGets = 0;
  await page.route('**/api/user', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    profileGets += 1;
    if (profileGets === 1) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Não autenticado' },
      }),
    });
  });

  await page.goto('/usuario');
  await expect(page).toHaveURL(/\/login$/);
});
