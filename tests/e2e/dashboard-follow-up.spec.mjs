import { expect, test } from '@playwright/test';

import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createUser(testInfo, label) {
  const suffix = `${Date.now()}-${testInfo.project.name}-${testInfo.retry}-${label}`;
  const email = `qa-dashboard-831-${suffix}@example.test`;
  await createVerifiedUser({
    name: 'QA Dashboard Follow-up',
    email,
    password,
  });
  return email;
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
}

test('dashboard: mês histórico e falhas parciais permanecem explícitos', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  const email = await createUser(testInfo, 'historical');
  await login(page, email);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', {
      name: 'Seu dinheiro, no seu controle',
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
  await expect(page.getByText(/Mês selecionado:/).first()).toBeVisible();

  await page.route('**/api/dashboard/home?**', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();

    if (!response.ok() || !payload?.data) {
      await route.fulfill({ response });
      return;
    }

    payload.data.netWorth = {
      status: 'ERROR',
      message: 'Falha simulada do patrimônio.',
    };
    payload.data.insights = {
      status: 'ERROR',
      message: 'Falha simulada dos insights.',
    };

    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.reload();

  await expect(
    page.getByText(
      'Parte do Dashboard está indisponível. Os valores conhecidos continuam visíveis sem transformar falha em zero.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator('span:visible', {
      hasText: /^Falha simulada do patrimônio\.$/,
    }),
  ).toBeVisible();
  await expect(
    page.locator(':is(span,strong,p):visible', {
      hasText: /^Indisponível$/,
    }).first(),
  ).toBeVisible();
});

test('dashboard: reflow permanece íntegro em 320/360/390px', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  const email = await createUser(testInfo, 'mobile');
  await login(page, email);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/dashboard');

    await expect(
      page.getByText('Disponível para gastar', { exact: true }).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
