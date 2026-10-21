import { horizontalOverflow } from './support/layout.mjs';
import { expect, test } from '@playwright/test';
import { seedPayrollFixture } from './support/payroll-fixture.mjs';
import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('folha: rota protegida redireciona sem sessão', async ({ page }) => {
  await page.goto('/rendimentos-trabalho');
  await expect(page).toHaveURL(/\/login(\?next=[^#]*)?$/);
});

test('folha: resolve adiantamento ambíguo manualmente e desbloqueia anual', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-payroll-${suffix}@example.test`;

  await createVerifiedUser({
    name: 'QA Folha',
    email,
    password,
  });
  await seedPayrollFixture(email);
  await login(page, email);

  await page.goto('/rendimentos-trabalho');
  await expect(
    page.getByRole('heading', { name: 'Rendimentos do trabalho', exact: true }),
  ).toBeVisible();

  await page.getByLabel('Ano dos rendimentos mensais').selectOption('2025');

  const advanceSection = page
    .locator('section.ds-panel')
    .filter({
      has: page.getByRole('heading', {
        name: 'Adiantamentos para revisar',
        exact: true,
      }),
    });
  await expect(advanceSection).toContainText('Revisão necessária');
  await expect(advanceSection).toContainText('Empresa E2E Folha');

  await page.getByRole('button', { name: 'Anual / IR', exact: true }).click();
  const annualSection = page
    .locator('section.ds-panel')
    .filter({
      has: page.getByRole('heading', {
        name: 'Conciliação anual',
        exact: true,
      }),
    });
  await expect(
    annualSection.getByText('Incompleto', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Mensal', exact: true }).click();

  const candidate = advanceSection.getByLabel('Rubrica de compensação');
  const candidateValue = await candidate
    .locator('option')
    .filter({ hasText: 'DESC ADIANT SALAR B' })
    .getAttribute('value');
  expect(candidateValue).not.toBeNull();
  await candidate.selectOption(candidateValue);

  await advanceSection
    .getByRole('button', { name: 'Confirmar vínculo', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();

  await expect(advanceSection).toContainText('Resolvido manualmente');

  const septemberSummary = page
    .locator('article')
    .filter({ hasText: '09/2025' })
    .filter({ hasText: 'Empresa E2E Folha' })
    .first();
  await expect(septemberSummary).toContainText('Adiantamento vinculado');

  await page.getByRole('button', { name: 'Anual / IR', exact: true }).click();
  await expect(
    annualSection.getByText('Conciliado', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Mensal', exact: true }).click();
  await advanceSection
    .getByRole('button', { name: 'Desfazer vínculo', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Desfazer', exact: true })
    .click();

  await expect(advanceSection).toContainText('Revisão necessária');

  await page.getByRole('button', { name: 'Anual / IR', exact: true }).click();
  await expect(
    annualSection.getByText('Incompleto', { exact: true }).first(),
  ).toBeVisible();
});

test('folha: importação 201 permanece sucesso quando refresh GET falha', async ({
  page,
}) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-payroll-refresh-${suffix}@example.test`;
  await createVerifiedUser({
    name: 'QA Folha Refresh',
    email,
    password,
  });

  let imported = false;

  await page.route('**/api/payroll/import/preview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          fileName: 'teste.pdf',
          requiresOcr: false,
          previewToken: 'preview-e2e',
          detectedType: 'MONTHLY_PAYSLIP',
          replacementCandidates: [],
          warnings: [],
          document: {
            documentType: 'MONTHLY_PAYSLIP',
            paymentType: 'REGULAR',
            employerName: 'Empresa Refresh',
            employerCnpj: '12.345.678/0001-90',
            employeeName: 'Pessoa Refresh',
            year: 2026,
            month: 9,
            salaryBaseCents: 100000,
            grossIncomeCents: 100000,
            totalEarningsCents: 100000,
            totalDeductionsCents: 5000,
            netPaidCents: 95000,
            inssCents: 10000,
            irrfCents: 5000,
            irrfBaseCents: 100000,
            fgtsBaseCents: 100000,
            fgtsAmountCents: 8000,
            earnings: [],
            deductions: [],
            bankMetadata: null,
            warnings: [],
            errors: [],
            fingerprint: 'a'.repeat(64),
            duplicate: false,
          },
        },
      }),
    });
  });

  await page.route('**/api/payroll/import/confirm', async (route) => {
    imported = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Documento importado',
        data: {
          created: true,
          duplicate: false,
          id: '00000000-0000-4000-8000-000000000001',
        },
      }),
    });
  });

  for (const pattern of ['**/api/payroll?*', '**/api/payroll/summary?*']) {
    await page.route(pattern, async (route) => {
      if (!imported) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Falha simulada de refresh' },
        }),
      });
    });
  }

  await login(page, email);
  await page.goto('/rendimentos-trabalho');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'teste.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf-e2e'),
  });
  await page.getByRole('button', { name: 'Analisar PDF', exact: true }).click();
  await expect(
    page.getByText(/Empresa Refresh/).first(),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Confirmar importação', exact: true })
    .click();

  await expect(
    page.getByText('Documento importado.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/alteração foi concluída.*atualizar/i).first(),
  ).toBeVisible();
  await expect(
    page.getByText('Não foi possível importar o documento.', { exact: true }),
  ).toHaveCount(0);
});

test('folha: showValues e layout mobile protegem valores em 320/360/390 px', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `qa-payroll-hidden-${suffix}@example.test`;
  await createVerifiedUser({
    name: 'QA Folha Privacidade',
    email,
    password,
  });
  await seedPayrollFixture(email, { showValues: false });
  await login(page, email);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/rendimentos-trabalho');
    await page.getByLabel('Ano dos rendimentos mensais').selectOption('2025');

    await expect(page.getByText('••••').first()).toBeVisible();
    await expect(page.getByText('R$ 1.000,00', { exact: true })).toHaveCount(0);
    await expect(page.getByText('R$ 950,00', { exact: true })).toHaveCount(0);

    expect(await page.evaluate(horizontalOverflow), `mensal @${width}`).toMatchObject({ overflow: 0 });

    await page.getByRole('button', { name: 'Anual / IR', exact: true }).click();
    await expect(page.getByText('••••').first()).toBeVisible();
    await expect(
      page.getByText('R$ 12.000,00', { exact: true }),
    ).toHaveCount(0);

    expect(await page.evaluate(horizontalOverflow), `anual @${width}`).toMatchObject({ overflow: 0 });
  }
});
