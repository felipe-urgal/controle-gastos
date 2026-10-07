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

async function seedPayrollFixture(email) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
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

  const annualSection = page
    .locator('section.ds-panel')
    .filter({
      has: page.getByRole('heading', {
        name: 'Conciliação anual',
        exact: true,
      }),
    });
  await expect(annualSection.getByText('Incompleto', { exact: true }).first()).toBeVisible();

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
  await expect(annualSection.getByText('Conciliado', { exact: true }).first()).toBeVisible();

  const septemberSummary = page
    .locator('article')
    .filter({ hasText: '09/2025' })
    .filter({ hasText: 'Empresa E2E Folha' })
    .first();
  await expect(septemberSummary).toContainText('Adiantamento vinculado');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await advanceSection
    .getByRole('button', { name: 'Desfazer vínculo', exact: true })
    .click();

  await expect(advanceSection).toContainText('Revisão necessária');
  await expect(annualSection.getByText('Incompleto', { exact: true }).first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
