import { expect, test } from '@playwright/test';

async function expectErrorAssociation(field, expectedMessage) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  const errorId = await field.getAttribute('aria-errormessage');
  expect(errorId).toBeTruthy();
  if (!errorId) throw new Error('Invalid field must expose aria-errormessage');

  await expect(field.page().locator(`#${errorId}`)).toHaveText(expectedMessage);
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
  await expect(password).toHaveAttribute('autocomplete', 'new-password');
  await expect(password).toHaveAttribute('enterkeyhint', 'next');
  await expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
  await expect(confirmation).toHaveAttribute('enterkeyhint', 'done');

  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(name).toBeFocused();
  await expectErrorAssociation(name, 'Nome é obrigatório');

  await page.goto('/login');

  const loginEmail = page.getByLabel('E-mail', { exact: true });
  const loginPassword = page.getByLabel('Senha', { exact: true });
  await expect(loginEmail).toHaveAttribute('autocomplete', 'email');
  await expect(loginEmail).toHaveAttribute('inputmode', 'email');
  await expect(loginEmail).toHaveAttribute('enterkeyhint', 'next');
  await expect(loginPassword).toHaveAttribute('autocomplete', 'current-password');
  await expect(loginPassword).toHaveAttribute('enterkeyhint', 'go');

  await page.goto('/forgot-password');

  const recoveryEmail = page.getByLabel('E-mail cadastrado', { exact: true });
  await expect(recoveryEmail).toHaveAttribute('autocomplete', 'email');
  await expect(recoveryEmail).toHaveAttribute('inputmode', 'email');
  await expect(recoveryEmail).toHaveAttribute('enterkeyhint', 'send');

  await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).click();
  await expect(recoveryEmail).toBeFocused();
  await expectErrorAssociation(recoveryEmail, 'E-mail é obrigatório');

  await page.goto('/reset-password?token=e2e-placeholder');

  const newPassword = page.getByLabel('Nova senha', { exact: true });
  const newPasswordConfirmation = page.getByLabel('Confirmar nova senha', { exact: true });
  await expect(newPassword).toHaveAttribute('autocomplete', 'new-password');
  await expect(newPassword).toHaveAttribute('enterkeyhint', 'next');
  await expect(newPasswordConfirmation).toHaveAttribute('autocomplete', 'new-password');
  await expect(newPasswordConfirmation).toHaveAttribute('enterkeyhint', 'done');

  await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(newPassword).toBeFocused();
  await expectErrorAssociation(newPassword, 'Nova senha é obrigatória');
});
