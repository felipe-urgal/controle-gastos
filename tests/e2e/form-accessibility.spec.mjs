import { expect, test } from '@playwright/test';

async function expectErrorAssociation(page, field, expectedMessage) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  const errorId = await field.getAttribute('aria-errormessage');
  expect(errorId).toBeTruthy();
  if (!errorId) throw new Error('Invalid field must expose aria-errormessage');

  await expect(page.locator(`#${errorId}`)).toHaveText(expectedMessage);
}

async function expectPasswordInputContract(
  field,
  accessibleName,
  autocomplete,
  enterKeyHint,
) {
  await expect(field).toHaveAccessibleName(accessibleName);
  await expect(field).toHaveAttribute('autocomplete', autocomplete);
  await expect(field).toHaveAttribute('enterkeyhint', enterKeyHint);
  await expect(field).toHaveAttribute('autocapitalize', 'none');
  await expect(field).toHaveAttribute('spellcheck', 'false');
}

test('formulários de autenticação expõem autofill, teclado e foco de erro', async ({ page }) => {
  await page.goto('/signup');

  const name = page.locator('input[name="name"]');
  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');
  const confirmation = page.locator('input[name="confirmPassword"]');

  await expect(name).toHaveAccessibleName('Nome completo');
  await expect(name).toHaveAttribute('autocomplete', 'name');
  await expect(name).toHaveAttribute('enterkeyhint', 'next');
  await expect(email).toHaveAccessibleName('E-mail');
  await expect(email).toHaveAttribute('autocomplete', 'email');
  await expect(email).toHaveAttribute('inputmode', 'email');
  await expect(email).toHaveAttribute('enterkeyhint', 'next');
  await expectPasswordInputContract(password, 'Senha', 'new-password', 'next');
  await expectPasswordInputContract(
    confirmation,
    'Confirmar senha',
    'new-password',
    'done',
  );

  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(name).toBeFocused();
  await expectErrorAssociation(page, name, 'Nome é obrigatório');

  await page.goto('/login');

  const loginEmail = page.locator('input[name="email"]');
  const loginPassword = page.locator('input[name="password"]');
  await expect(loginEmail).toHaveAccessibleName('E-mail');
  await expect(loginEmail).toHaveAttribute('autocomplete', 'email');
  await expect(loginEmail).toHaveAttribute('inputmode', 'email');
  await expect(loginEmail).toHaveAttribute('enterkeyhint', 'next');
  await expectPasswordInputContract(
    loginPassword,
    'Senha',
    'current-password',
    'go',
  );

  await page.goto('/forgot-password');

  const recoveryEmail = page.locator('input[name="email"]');
  await expect(recoveryEmail).toHaveAccessibleName('E-mail cadastrado');
  await expect(recoveryEmail).toHaveAttribute('autocomplete', 'email');
  await expect(recoveryEmail).toHaveAttribute('inputmode', 'email');
  await expect(recoveryEmail).toHaveAttribute('enterkeyhint', 'send');

  await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).click();
  await expect(recoveryEmail).toBeFocused();
  await expectErrorAssociation(page, recoveryEmail, 'E-mail é obrigatório');

  await page.goto('/reset-password?token=e2e-placeholder');

  const newPassword = page.locator('input[name="novaSenha"]');
  const newPasswordConfirmation = page.locator('input[name="confirmarSenha"]');
  await expectPasswordInputContract(
    newPassword,
    'Nova senha',
    'new-password',
    'next',
  );
  await expectPasswordInputContract(
    newPasswordConfirmation,
    'Confirmar nova senha',
    'new-password',
    'done',
  );

  await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(newPassword).toBeFocused();
  await expectErrorAssociation(page, newPassword, 'Nova senha é obrigatória');
});
