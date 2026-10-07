import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

test('perfil desktop mantém todas as áreas acessíveis sem overflow', async ({ page }) => {
  const email = `profile-desktop-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await createVerifiedUser({
    name: 'QA Perfil Desktop',
    email,
    password,
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/usuario');

  const navigation = page.getByRole('navigation', {
    name: 'Áreas de configuração',
  });
  await expect(navigation).toBeVisible();

  for (const section of [
    'Conta',
    'Preferências',
    'Segurança',
    'Integrações',
    'Exportação',
    'Sessão',
    'Risco',
  ]) {
    const tab = navigation.getByRole('button', { name: section, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(tab).toBeFocused();
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);

  await navigation.getByRole('button', { name: 'Segurança', exact: true }).click();
  await page.getByRole('link', { name: 'Editar perfil', exact: true }).click();
  await expect(page).toHaveURL(/\/usuario\/editar$/);
  await expect(page.getByLabel(/^Nome\b/)).toBeVisible();
  await expect(page.getByLabel('Novo e-mail', { exact: true })).toBeVisible();
});
