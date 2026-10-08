import { expect, test } from '@playwright/test';

const OWNER_KEY = 'controle-gastos:offline-draft-owner:v1';
const DRAFT_KEY = 'controle-gastos:offline-transaction-draft:v1:user-static';

async function openStaticPage(page, { blockWrites = false } = {}) {
  await page.addInitScript(
    ({ ownerKey, blocked }) => {
      if (!window.sessionStorage.getItem('__seeded')) {
        window.localStorage.setItem(ownerKey, 'user-static');
        window.sessionStorage.setItem('__seeded', '1');
      }
      if (blocked) {
        Storage.prototype.setItem = () => {
          throw new DOMException('quota', 'QuotaExceededError');
        };
      }
    },
    { ownerKey: OWNER_KEY, blocked: blockWrites },
  );
  await page.goto('/offline-transacao.html');
}

async function fillDraft(page, { amount, description, date }) {
  await page.locator('#amount').fill(amount);
  await page.locator('#description').fill(description);
  if (date) await page.locator('#date').fill(date);
}

test('não afirma "Rascunho salvo" quando o storage está bloqueado ou cheio', async ({ page }) => {
  await openStaticPage(page, { blockWrites: true });
  await fillDraft(page, { amount: '10,00', description: 'Mercado' });
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();

  const status = page.locator('#status');
  await expect(status).toContainText('NÃO foi salvo');
  await expect(status).not.toContainText('Rascunho salvo');
});

test('exige confirmação antes de substituir um rascunho diferente e preserva a data escolhida', async ({ page }) => {
  await openStaticPage(page);
  await fillDraft(page, { amount: '10,00', description: 'Primeiro', date: '2026-12-31' });
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.locator('#status')).toContainText('Rascunho salvo');

  await fillDraft(page, { amount: '20,00', description: 'Segundo' });
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.locator('#status')).toContainText('substituirá');

  let stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DRAFT_KEY);
  expect(stored.description).toBe('Primeiro');
  expect(stored).toMatchObject({ year: 2026, month: 12, day: 31 });

  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.locator('#status')).toContainText('Rascunho salvo');
  stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DRAFT_KEY);
  expect(stored).toMatchObject({ description: 'Segundo', amount: 2000, day: 31 });
});

test('copy deixa explícito o armazenamento local e o rascunho único', async ({ page }) => {
  await openStaticPage(page);
  await expect(page.getByText('sem criptografia', { exact: false }).first()).toBeVisible();
  await expect(page.locator('#single-draft-note')).toContainText('substitui');
});

test('atalho do manifest para nova transação existe e usa rota coberta pelo fallback offline', async ({ request }) => {
  const manifest = await (await request.get('/manifest.json')).json();
  const urls = (manifest.shortcuts ?? []).map((shortcut) => shortcut.url);
  expect(urls).toContain('/transacoes/nova');
});
