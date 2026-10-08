import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { createVerifiedUser } from './support/verified-user.mjs';

const password = 'Playwright123!';

function fingerprint() {
  return randomUUID().replaceAll('-', '').padEnd(64, '0').slice(0, 64);
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedPayrollFixture(email, { showValues = true } = {}) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    if (user.showValues !== showValues) {
      await prisma.user.update({
        where: { id: user.id },
        data: { showValues },
      });
    }
    const regulars = [];

    for (let month = 1; month <= 12; month += 1) {
      regulars.push(
        await prisma.payrollDocument.create({
          data: {
            userId: user.id,
            documentType: 'MONTHLY_PAYSLIP',
            paymentType: 'REGULAR',
            employerName: 'Empresa E2E Folha',
            employerCnpj: '12.345.678/0001-90',
            employeeName: 'Pessoa E2E',
            year: 2025,
            month,
            grossIncomeCents: 100000,
            totalEarningsCents: 100000,
            totalDeductionsCents: 5000,
            netPaidCents: 95000,
            inssCents: 10000,
            irrfCents: 5000,
            earnings: [],
            deductions:
              month === 9
                ? [
                    {
                      code: '500',
                      description: 'DESC ADIANT SALAR A',
                      reference: null,
                      earningsCents: null,
                      deductionsCents: 50000,
                    },
                    {
                      code: '501',
                      description: 'DESC ADIANT SALAR B',
                      reference: null,
                      earningsCents: null,
                      deductionsCents: 50000,
                    },
                  ]
                : [],
            warnings: [],
            importFingerprint: fingerprint(),
          },
        }),
      );
    }

    const advance = await prisma.payrollDocument.create({
      data: {
        userId: user.id,
        documentType: 'PAYROLL_ADVANCE',
        paymentType: 'ADVANCE',
        employerName: 'Empresa E2E Folha',
        employerCnpj: '12.345.678/0001-90',
        employeeName: 'Pessoa E2E',
        year: 2025,
        month: 9,
        grossIncomeCents: 50000,
        totalEarningsCents: 50000,
        totalDeductionsCents: 1000,
        netPaidCents: 49000,
        inssCents: null,
        irrfCents: 1000,
        earnings: [],
        deductions: [],
        warnings: [],
        importFingerprint: fingerprint(),
      },
    });

    await prisma.payrollAdvanceLink.create({
      data: {
        userId: user.id,
        advanceDocumentId: advance.id,
        status: 'PENDING',
        compensationCents: null,
        reason: 'Mais de uma folha/rubrica pode compensar este adiantamento.',
        evidence: {
          employerCnpj: '12.345.678/0001-90',
          year: 2025,
          month: 9,
          expectedAdvanceCents: 50000,
        },
      },
    });

    await prisma.annualEmploymentIncomeStatement.create({
      data: {
        userId: user.id,
        calendarYear: 2025,
        taxExercise: 2026,
        payerName: 'Empresa E2E Folha',
        payerTaxId: '12.345.678/0001-90',
        beneficiaryName: 'Pessoa E2E',
        beneficiaryTaxId: '123.456.789-00',
        incomeNature: 'Rendimentos do trabalho assalariado',
        taxableIncomeCents: 1200000,
        officialPensionCents: 120000,
        complementaryPensionCents: null,
        alimonyCents: null,
        irrfCents: 61000,
        thirteenthSalaryCents: null,
        thirteenthIrrfCents: null,
        exemptIncome: [],
        exclusiveTaxation: [],
        accumulatedIncome: [],
        notes: [],
        warnings: [],
        importFingerprint: fingerprint(),
      },
    });

    return {
      advanceId: advance.id,
      regularId: regulars[8].id,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
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

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await advanceSection
    .getByRole('button', { name: 'Confirmar vínculo', exact: true })
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
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await advanceSection
    .getByRole('button', { name: 'Desfazer vínculo', exact: true })
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

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(horizontalOverflow).toBe(false);

    await page.getByRole('button', { name: 'Anual / IR', exact: true }).click();
    await expect(page.getByText('••••').first()).toBeVisible();
    await expect(
      page.getByText('R$ 12.000,00', { exact: true }),
    ).toHaveCount(0);

    const annualOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(annualOverflow).toBe(false);
  }
});
