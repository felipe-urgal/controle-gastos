import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import {
  createVerificationLink,
  createVerifiedUser,
  isEmailVerified,
  setKnownPasswordResetToken,
} from './support/verified-user.mjs';

const password = 'Playwright-Senha-123';
const newPassword = 'Playwright-Nova-456';

// Exclui o anunciador de rotas do Next, que também tem role=alert.
function alertOf(page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

function userStatus(page) {
  return page.evaluate(async () => (await fetch('/api/user', { credentials: 'include' })).status);
}

async function fillLogin(page, email, pass) {
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(pass);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('ciclo completo: signup, verificação, login, reset e revogação de sessão', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-auth-${suffix}@example.test`;
  await setIsolatedClientIp(page, email);

  // Signup mostra "Confira seu e-mail" em vez de redirecionar sem contexto.
  await page.goto('/signup');
  await page.getByLabel(/^Nome\b/).fill('QA Auth');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByLabel(/^Confirmar senha\b/).fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  expect(await isEmailVerified(email)).toBe(false);

  // Conta não verificada não ganha sessão e recebe mensagem genérica.
  await page.getByRole('link', { name: 'Ir para o login' }).first().click();
  await fillLogin(page, email, password);
  await expect(alertOf(page)).toContainText('E-mail ou senha inválidos!');
  await expect(page).toHaveURL(/\/login$/);

  // Link inválido: aviso com reenvio e query removida do endereço.
  await page.goto('/api/auth/verify-email?token=invalido');
  await expect(page.getByText('Link inválido ou expirado.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByRole('button', { name: 'reenvie a verificação' }).click();
  await expect(
    page.getByText('Se houver um cadastro pendente para este e-mail, enviaremos um novo link.'),
  ).toBeVisible();

  // Link válido confirma o e-mail e o login funciona.
  await page.goto(await createVerificationLink({ email }));
  await expect(page.getByText('E-mail confirmado com sucesso. Entre na sua conta.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await fillLogin(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await userStatus(page)).toBe(200);

  // Forgot/reset em outro contexto, mantendo a sessão antiga viva.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await setIsolatedClientIp(otherPage, `${email}-reset`);
  await otherPage.goto('/forgot-password');
  await otherPage.getByLabel(/^E-mail cadastrado\b/).fill(email);
  await otherPage.getByRole('button', { name: 'Enviar link de recuperação' }).click();
  await expect(otherPage.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();

  const rawToken = `e2e-reset-${suffix}`;
  await setKnownPasswordResetToken({ email, rawToken });
  await otherPage.goto(`/reset-password?token=${rawToken}`);
  await expect(otherPage).toHaveURL(/\/reset-password$/); // segredo fora da URL
  await otherPage.getByLabel(/^Nova senha\b/).fill(newPassword);
  await otherPage.getByLabel(/^Confirmar\b/).fill(newPassword);
  await otherPage.getByRole('button', { name: /Redefinir senha/ }).click();
  await expect(otherPage.getByText('Senha redefinida com sucesso!').first()).toBeVisible();

  // Sessão antiga revogada; token é one-time.
  expect(await userStatus(page)).toBe(401);
  const replay = await other.request.post('/api/auth/reset-password', {
    data: { token: rawToken, novaSenha: 'Outra-Senha-789x' },
  });
  expect(replay.status()).toBe(400);
  await other.close();

  // Senha antiga falha, nova funciona.
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await setIsolatedClientIp(freshPage, `${email}-fresh`);
  await freshPage.goto('/login');
  await fillLogin(freshPage, email, password);
  await expect(alertOf(freshPage)).toContainText('E-mail ou senha inválidos!');
  await fillLogin(freshPage, email, newPassword);
  await expect(freshPage).toHaveURL(/\/dashboard$/);
  await fresh.close();
});

test('rota protegida preserva destino com next e rejeita redirect externo', async ({ page }) => {
  const email = `qa-next-${Date.now()}-${test.info().project.name}@example.test`;
  await createVerifiedUser({ name: 'QA Next', email, password });
  await setIsolatedClientIp(page, email);

  await page.goto('/patrimonio');
  await expect(page).toHaveURL(/\/login\?next=%2Fpatrimonio$/);
  await fillLogin(page, email, password);
  await expect(page).toHaveURL(/\/patrimonio$/);

  await page.context().clearCookies();
  await page.goto('/login?next=https://evil.example/x');
  await fillLogin(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('login rejeita conta não verificada', async ({ request }) => {
  const email = `qa-unverified-${Date.now()}-${test.info().project.name}@example.test`;
  const signup = await request.post('/api/auth/signup', {
    headers: { 'x-forwarded-for': `10.77.${Date.now() % 250}.${(Date.now() >> 3) % 250}` },
    data: { name: 'QA Unverified', email, password },
  });
  expect(signup.status()).toBe(202);

  const login = await request.post('/api/auth/login', { data: { email, password } });
  expect(login.status()).toBe(401);
});

for (const width of [320, 360, 390]) {
  test(`telas públicas de auth sem overflow horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    for (const path of ['/login', '/signup', '/forgot-password']) {
      await page.goto(path);
      await expect(page.locator('main, form').first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} em ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}
