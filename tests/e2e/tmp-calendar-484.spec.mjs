import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

test('QA #484 — Calendário mantém loading, reflow e foco em 320px', async ({ page, request }) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().retry}`;
  const email = `calendar-484-${suffix}@example.test`;

  const signupResponse = await request.post('/api/auth/signup', {
    data: {
      name: 'Calendar CLS E2E',
      email,
      password,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.route('**/api/transactions?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });

  await page.goto('/calendario');
  await expect(page.getByRole('heading', { name: 'Calendário', exact: true })).toBeVisible();

  const monthNavigator = page.locator('aside[aria-label="Navegação mensal"]');
  const previousButton = monthNavigator.getByRole('button', { name: 'Mês anterior', exact: true });
  const nextButton = monthNavigator.getByRole('button', { name: 'Próximo mês', exact: true });

  await expect(monthNavigator.locator('.animate-pulse')).toHaveCount(35);
  await expect(previousButton).toBeDisabled();
  await expect(nextButton).toBeDisabled();

  await expect(monthNavigator.locator('[aria-label="Dias do mês"]')).toBeVisible();
  await expect(monthNavigator.locator('.animate-pulse')).toHaveCount(0);
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();
  await expect(page.getByText('Nenhum lançamento neste dia.', { exact: true })).toBeVisible();
  await expect(page.getByText('Nenhuma pendência futura neste recorte.', { exact: true })).toBeVisible();

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

  await previousButton.focus();
  await expect(previousButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nextButton).toBeFocused();

  const firstDay = monthNavigator.locator('[aria-label="Dias do mês"] button').first();
  await firstDay.focus();
  await expect(firstDay).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(firstDay).toHaveAttribute('aria-pressed', 'true');
});
