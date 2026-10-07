import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';
const widths = [320, 360, 390];

async function login(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('perfil mantém navegação acessível em 320/360/390px', async ({ page }) => {
  const email = `profile-mobile-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await createVerifiedUser({
    name: 'QA Perfil Mobile',
    email,
    password,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, email);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/usuario');

    const navigation = page.getByRole('navigation', {
      name: 'Áreas de configuração',
    });
    await expect(navigation).toBeVisible();

    const tabs = navigation.getByRole('button');
    expect(await tabs.count()).toBeGreaterThanOrEqual(7);

    for (let index = 0; index < await tabs.count(); index += 1) {
      const tab = tabs.nth(index);
      await tab.click();

      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(tab).toBeFocused();

      const geometry = await tab.evaluate((element) => {
        const tabRect = element.getBoundingClientRect();
        const navRect = element.parentElement?.getBoundingClientRect();

        return {
          height: tabRect.height,
          withinNavigation:
            Boolean(navRect) &&
            tabRect.left >= navRect.left - 1 &&
            tabRect.right <= navRect.right + 1,
          pageFitsViewport:
            document.documentElement.scrollWidth <= window.innerWidth + 1,
        };
      });

      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.withinNavigation).toBe(true);
      expect(geometry.pageFitsViewport).toBe(true);
    }
  }

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Risco', exact: true }).click();

  const opener = page.getByRole('button', {
    name: 'Excluir minha conta',
    exact: true,
  });
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Excluir sua conta' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
