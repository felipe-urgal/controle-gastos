import { expect, test } from '@playwright/test';

import {
  api,
  expectMasked,
  expectNoMoneyLeak,
  forEachWidth,
  startScenario,
} from './support/matrix.mjs';

async function seedDebtsAndGoals(page, suffix) {
  const debt = await api(page, 'POST', '/api/debts', {
    name: `Financiamento ${suffix}`.slice(0, 100),
    currency: 'BRL',
    balance: 1234567,
    installmentAmount: 98765,
    dueDate: '2031-03-10',
    remainingInstallments: 12,
    institution: 'Banco E2E',
    description: null,
  });
  const goal = await api(page, 'POST', '/api/goals', {
    name: `Reserva ${suffix}`.slice(0, 100),
    currency: 'BRL',
    targetAmount: 765432,
    targetDate: '2031-12-31',
    description: null,
  });
  return { debt, goal };
}

test('dívidas e metas: sem overflow em 320/360/390/1280 e modal mantém foco', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const { suffix } = await startScenario(page, testInfo, 'dg-mobile');
  await seedDebtsAndGoals(page, suffix);

  for (const route of ['/dividas', '/metas']) {
    await forEachWidth(page, async () => {
      await page.goto(route);
      await expect(page.locator('article').first()).toBeVisible();
    });
  }

  // Modal compartilhado: focus trap, Escape e restauração de foco em mobile.
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/dividas');
    const trigger = page.getByRole('button', { name: 'Nova dívida', exact: true });
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Nova dívida', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();

    // Foco permanece dentro do modal após várias tabulações.
    for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
    ).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(
      await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('dívidas: quitar → reabrir e arquivar → restaurar em mobile', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const { suffix } = await startScenario(page, testInfo, 'dg-lifecycle');
  const name = `Dívida ciclo ${suffix}`.slice(0, 100);
  await api(page, 'POST', '/api/debts', {
    name,
    currency: 'BRL',
    balance: 10000,
    installmentAmount: null,
    dueDate: null,
    remainingInstallments: null,
    institution: null,
    description: null,
  });

  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/dividas');
  const card = page.locator('article').filter({ hasText: name }).first();
  await expect(card).toBeVisible();

  // Quitar
  await card.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  const pay = page.getByRole('dialog');
  await expect(pay).toBeVisible();
  await pay.getByRole('textbox', { name: /Valor pago/ }).fill('100,00');
  await pay.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(pay).toBeHidden();
  await expect(card).toContainText('Quitada');

  // Reabrir com ajuste
  await card.getByRole('button', { name: 'Reabrir com ajuste', exact: true }).click();
  const adjust = page.getByRole('dialog');
  await expect(adjust).toBeVisible();
  await adjust.getByRole('textbox', { name: /Novo saldo devedor/ }).fill('50,00');
  await adjust.getByRole('button', { name: 'Registrar ajuste', exact: true }).click();
  await expect(adjust).toBeHidden();
  await expect(card).toContainText('Ativa');

  // Quitar de novo → arquivar → restaurar
  await card.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(pay).toBeVisible();
  await pay.getByRole('textbox', { name: /Valor pago/ }).fill('50,00');
  await pay.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(pay).toBeHidden();
  await expect(card).toContainText('Quitada');

  await card.getByRole('button', { name: 'Arquivar', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Arquivar', exact: true }).click();
  await expect(confirm).toBeHidden();

  await page.getByRole('navigation', { name: 'Filtrar dívidas' })
    .getByRole('button', { name: /Arquivadas/ }).click();
  const archived = page.locator('article').filter({ hasText: name }).first();
  await expect(archived).toContainText('Arquivada');
  await archived.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.getByRole('navigation', { name: 'Filtrar dívidas' })
    .getByRole('button', { name: /Quitadas|Todas/ }).first().click();
  await expect(page.locator('article').filter({ hasText: name }).first()).not.toContainText('Arquivada');
});

test('dívidas e metas: showValues=false não vaza valores em cards, histórico e modais', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const { suffix } = await startScenario(page, testInfo, 'dg-privacy', { showValues: false });
  await seedDebtsAndGoals(page, suffix);

  await forEachWidth(page, async () => {
    await page.goto('/dividas');
    await expect(page.getByRole('button', { name: 'Histórico', exact: true }).first()).toBeVisible();
    await expectMasked(page);
    await expectNoMoneyLeak(page);
  });

  // histórico e modais
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/dividas');
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: 'Histórico', exact: true }) })
    .first();
  await card.getByRole('button', { name: 'Histórico', exact: true }).click();
  const history = page.getByRole('dialog').first();
  await expect(history).toBeVisible();
  await expectNoMoneyLeak(page);
  await page.keyboard.press('Escape');

  await card.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await expectNoMoneyLeak(page);
  await page.keyboard.press('Escape');

  await forEachWidth(page, async () => {
    await page.goto('/metas');
    await expect(page.locator('article').first()).toBeVisible();
    await expectMasked(page);
    await expectNoMoneyLeak(page);
  });
});
