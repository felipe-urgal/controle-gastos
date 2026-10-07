import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import {
  createVerifiedUser,
  seedPrivacyFinancialFixture,
} from './support/verified-user.mjs';

const password = 'Playwright123!';
const visibleAmount = '123,45';

async function login(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectAmountHidden(page, path) {
  await page.goto(path);

  await expect
    .poll(() =>
      page.evaluate(() => document.body.innerText.includes('••••')),
    )
    .toBe(true);

  const privacyState = await page.evaluate((needle) => {
    const attributes = ['aria-label', 'title', 'data-tooltip'];
    const attributeLeaks = [];

    for (const element of document.querySelectorAll('*')) {
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        if (value?.includes(needle)) {
          attributeLeaks.push({ attribute, value });
        }
      }
    }

    return {
      visibleText: document.body.innerText,
      attributeLeaks,
    };
  }, visibleAmount);

  expect(privacyState.visibleText).toContain('••••');
  expect(privacyState.visibleText).not.toContain(visibleAmount);
  expect(privacyState.attributeLeaks).toEqual([]);
}

test('showValues=false oculta valor financeiro entre módulos sem mascarar export explícito', async ({
  page,
}) => {
  const email = `privacy-cross-module-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await createVerifiedUser({
    name: 'QA Privacidade',
    email,
    password,
    showValues: false,
  });
  await seedPrivacyFinancialFixture({ email });

  await login(page, email);

  for (const path of ['/dashboard', '/transacoes', '/contas', '/calendario']) {
    await expectAmountHidden(page, path);
  }

  const csv = await page.evaluate(async () => {
    const response = await fetch('/api/user/export?format=csv', {
      cache: 'no-store',
    });
    return {
      status: response.status,
      text: await response.text(),
    };
  });

  expect(csv.status).toBe(200);
  expect(csv.text).toContain('"12345"');
  expect(csv.text).toContain('Compra privacidade cross-module');
});
