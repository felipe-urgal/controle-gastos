import { expect, test } from '@playwright/test';

async function expectErrorAssociation(page, field, expectedMessage) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  const errorId = await field.getAttribute('aria-errormessage');
  expect(errorId).toBeTruthy();
  if (!errorId) throw new Error('Invalid field must expose aria-errormessage');

  await expect(page.locator(`#${errorId}`)).toHaveText(expectedMessage);
}

async function expectPasswordInputContract(field, autocomplete, enterKeyHint) {
  await expect(field).toHaveAttribute('autocomplete', autocomplete);
  await expect(field).toHaveAttribute('enterkeyhint', enterKeyHint);
  await expect(field).toHaveAttribute('autocapitalize', 'none');
  await expect(field).toHaveAttribute('spellcheck', 'false');
}

test('formulários de autenticação expõem autofill, teclado e foco de erro', async ({ page }) => {
  await page.goto('/signup');

  const name = page.getByLabel('Nome completo', { exact: true });
  const email = page.getByLabel('E-mail', { exact: true });
  const password = page.getByLabel('Senha', { exact: true });
  const confirmation = page.getByLabel('Confirmar senha', { exact: true });

  await expect(name).toHaveAttribute('autocomplete', 'name');
  await expect(name).toHaveAttribute('enterkeyhint', 'next');
  await expect(email).toHaveAttribute('autocomplete', 'email');
  await expect(email).toHaveAttribute('inputmode', 'email');
  await expect(email).toHaveAttribute('enterkeyhint', 'next');
  await expectPasswordInputContract(password, 'new-password', 'next');
  await expectPasswordInputContract(confirmation, 'new-password', 'done');

  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(name).toBeFocused();
  await expectErrorAssociation(page, name, 'Nome é obrigatório');

  await page.goto('/login');

  const loginEmail = page.getByLabel('E-mail', { exact: true });
  const loginPassword = page.getByLabel('Senha', { exact: true });
  await expect(loginEmail).toHaveAttribute('autocomplete', 'email');
  await expect(loginEmail).toHaveAttribute('inputmode', 'email');
  await expect(loginEmail).toHaveAttribute('enterkeyhint', 'next');
  await expectPasswordInputContract(loginPassword, 'current-password', 'go');

  await page.goto('/forgot-password');

  const recoveryEmail = page.getByLabel('E-mail cadastrado', { exact: true });
  await expect(recoveryEmail).toHaveAttribute('autocomplete', 'email');
  await expect(recoveryEmail).toHaveAttribute('inputmode', 'email');
  await expect(recoveryEmail).toHaveAttribute('enterkeyhint', 'send');

  await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).click();
  await expect(recoveryEmail).toBeFocused();
  await expectErrorAssociation(page, recoveryEmail, 'E-mail é obrigatório');

  await page.goto('/reset-password?token=e2e-placeholder');

  const newPassword = page.getByLabel('Nova senha', { exact: true });
  const newPasswordConfirmation = page.getByLabel('Confirmar nova senha', { exact: true });
  await expectPasswordInputContract(newPassword, 'new-password', 'next');
  await expectPasswordInputContract(newPasswordConfirmation, 'new-password', 'done');

  await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(newPassword).toBeFocused();
  await expectErrorAssociation(page, newPassword, 'Nova senha é obrigatória');
});
