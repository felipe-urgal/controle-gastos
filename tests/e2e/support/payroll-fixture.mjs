import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

function fingerprint() {
  return randomUUID().replaceAll('-', '').padEnd(64, '0').slice(0, 64);
}

export async function seedPayrollFixture(email, { showValues = true } = {}) {
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
