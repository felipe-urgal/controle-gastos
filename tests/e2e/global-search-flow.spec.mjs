import { expect, test } from '@playwright/test';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedSearchFixture(page, marker) {
  return page.evaluate(async (searchMarker) => {
    async function create(url, data) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(body)}`);
      }
      return body.data;
    }

    const account = await create('/api/accounts', {
      name: `${searchMarker} Conta`,
      type: 'CREDIT_DEBIT',
      currency: 'BRL',
      color: '#2563EB',
      icon: 'wallet',
      description: 'Conta da busca global E2E',
      isActive: true,
    });

    const category = await create('/api/categories', {
      name: `${searchMarker} Categoria`.slice(0, 50),
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'tag',
      description: 'Categoria da busca global E2E',
      isActive: true,
      position: 0,
    });

    const now = new Date();
    const transaction = await create('/api/transactions', {
      accountId: account.id,
      categoryId: category.id,
      amount: 987654,
      description: `${searchMarker} Mercado`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: Math.max(1, Math.min(now.getDate(), 28)),
      status: 'COMPLETED',
      type: 'EXPENSE',
    });

    const rule = await create('/api/import-rules', {
      name: `${searchMarker} Regra`,
      isActive: true,
      priority: 0,
      transactionType: 'EXPENSE',
      descriptionOperator: 'CONTAINS',
      descriptionPattern: searchMarker,
      accountId: account.id,
      categoryId: category.id,
      minAmountCents: null,
      maxAmountCents: null,
    });

    return {
      accountId: account.id,
      categoryId: category.id,
      transactionId: transaction.id,
      ruleId: rule.id,
    };
  }, marker);
}

test('busca global: desktop, teclado, mobile e respostas obsoletas', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-global-search-${suffix}@example.test`;
  const marker = `CaféBusca${suffix.slice(-8)}`;

  await createVerifiedUser({ name: 'QA Busca Global', email, password });

  await login(page, email);
  const fixture = await seedSearchFixture(page, marker);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');

  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Busca global', exact: true });
  await expect(dialog).toBeVisible();

  const input = dialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
  await expect(input).toBeFocused();
  await input.fill(marker);

  await expect(dialog.getByText(`${marker} Mercado`, { exact: true })).toBeVisible();
  await expect(dialog.getByText(`${marker} Conta`, { exact: true })).toBeVisible();
  await expect(dialog.getByText(`${marker} Categoria`.slice(0, 50), { exact: true })).toBeVisible();
  await expect(dialog.getByText(`${marker} Regra`, { exact: true })).toBeVisible();
  await expect(dialog).not.toContainText('987654');

  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/transacoes/show/${fixture.transactionId}$`));

  // Verifica que a regra abre seu contexto específico, não a listagem genérica.
  await page.goto('/dashboard');
  await page.keyboard.press('Control+K');
  const ruleDialog = page.getByRole('dialog', { name: 'Busca global', exact: true });
  const ruleInput = ruleDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');
  await ruleInput.fill(`${marker} Regra`);
  await expect(ruleDialog.getByText(`${marker} Regra`, { exact: true })).toBeVisible();
  await ruleDialog.getByText(`${marker} Regra`, { exact: true }).click();
  await expect(page).toHaveURL((url) =>
    url.pathname === '/transacoes/importar/regras' && url.searchParams.get('ruleId') === fixture.ruleId,
  );

  await page.goto('/dashboard');
  await page.setViewportSize({ width: 390, height: 760 });
  await page.getByRole('button', { name: 'Abrir busca global', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Busca global', exact: true })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Busca global', exact: true })
    .getByLabel('Buscar em páginas, transações, contas, categorias e regras')
    .fill('resultado-inexistente');
  await expect(page.getByText('Nenhum resultado encontrado.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar busca global', exact: true }).click();

  await page.setViewportSize({ width: 1280, height: 800 });

  await page.route('**/api/search?*', async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') ?? '';
    const isSlow = query === 'slow';

    if (isSlow) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const title = isSlow ? 'Resultado antigo' : 'Resultado atual';
    // Ao digitar outra query, o navegador pode cancelar a requisição anterior.
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            query,
            groups: [
              {
                type: 'ACCOUNT',
                items: [
                  {
                    id: isSlow ? 'slow-id' : 'fast-id',
                    type: 'ACCOUNT',
                    title,
                    subtitle: 'BRL · Ativa',
                    href: '/contas',
                  },
                ],
              },
            ],
            total: 1,
            limitPerGroup: 5,
            totalLimit: 20,
          },
        }),
      });
    } catch (error) {
      // A rota antiga pode ter sido cancelada enquanto a resposta era atrasada.
      if (!/Route is already handled/.test(String(error))) {
        throw error;
      }
    }
  });

  await page.keyboard.press('Control+K');
  const raceDialog = page.getByRole('dialog', { name: 'Busca global', exact: true });
  const raceInput = raceDialog.getByLabel('Buscar em páginas, transações, contas, categorias e regras');

  await raceInput.fill('slow');
  await page.waitForRequest((request) => request.url().includes('/api/search?q=slow'));
  await raceInput.fill('fast');

  await expect(raceDialog.getByText('Resultado atual', { exact: true })).toBeVisible();
  await expect(raceDialog.getByText('Resultado antigo', { exact: true })).toHaveCount(0);

  await page.unroute('**/api/search?*');
});
