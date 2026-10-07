import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { deleteUser } from "@/app/lib/users/delete-user";

function hash64(seed: string) {
  return (seed.replaceAll("-", "") + "0".repeat(64)).slice(0, 64);
}

async function ownedCounts(userId: string) {
  const queries = {
    users: prisma.user.count({ where: { id: userId } }),
    accounts: prisma.account.count({ where: { userId } }),
    categories: prisma.category.count({ where: { userId } }),
    categoryMonthlyLimits: prisma.categoryMonthlyLimit.count({ where: { userId } }),
    importRules: prisma.transactionImportRule.count({ where: { userId } }),
    reconciliationEvents: prisma.accountReconciliationEvent.count({ where: { userId } }),
    transactions: prisma.transaction.count({ where: { userId } }),
    merchants: prisma.merchant.count({ where: { userId } }),
    merchantAliases: prisma.merchantAlias.count({ where: { userId } }),
    merchantAliasEvents: prisma.merchantAliasEvent.count({ where: { userId } }),
    tags: prisma.tag.count({ where: { userId } }),
    transactionTags: prisma.transactionTag.count({ where: { userId } }),
    transactionAllocations: prisma.transactionAllocation.count({ where: { userId } }),
    transactionTemplates: prisma.transactionTemplate.count({ where: { userId } }),
    transactionSeries: prisma.transactionSeries.count({ where: { userId } }),
    subscriptionReviews: prisma.subscriptionReview.count({ where: { userId } }),
    recurrencePatternReviews: prisma.recurrencePatternReview.count({ where: { userId } }),
    transfers: prisma.transfer.count({ where: { userId } }),
    creditCardPayments: prisma.creditCardPayment.count({ where: { userId } }),
    financialGoals: prisma.financialGoal.count({ where: { userId } }),
    financialGoalEntries: prisma.financialGoalEntry.count({ where: { userId } }),
    exchangeRates: prisma.exchangeRate.count({ where: { userId } }),
    debts: prisma.debt.count({ where: { userId } }),
    debtAdjustments: prisma.debtAdjustment.count({ where: { userId } }),
    periodicFinancialSummaries: prisma.periodicFinancialSummary.count({ where: { userId } }),
    investmentAssets: prisma.investmentAsset.count({ where: { userId } }),
    investmentOperations: prisma.investmentOperation.count({ where: { userId } }),
    investmentIncomes: prisma.investmentIncome.count({ where: { userId } }),
    investmentFiscalEvents: prisma.investmentFiscalEvent.count({ where: { userId } }),
    investmentFiscalCostAdjustments: prisma.investmentFiscalCostAdjustment.count({ where: { userId } }),
    investmentTaxLossAdjustments: prisma.investmentTaxLossAdjustment.count({ where: { userId } }),
    investmentTaxWithholdings: prisma.investmentTaxWithholding.count({ where: { userId } }),
    investmentTaxPayments: prisma.investmentTaxPayment.count({ where: { userId } }),
    investmentForeignTaxesPaid: prisma.investmentForeignTaxPaid.count({ where: { userId } }),
    investmentBrokerageTaxReviews: prisma.investmentBrokerageTaxReview.count({ where: { userId } }),
    investmentFiscalPendingResolutions: prisma.investmentFiscalPendingResolution.count({ where: { userId } }),
    annualFinancialTaxStatements: prisma.annualFinancialTaxStatement.count({ where: { userId } }),
    mcpAccessTokens: prisma.mcpAccessToken.count({ where: { userId } }),
    totpRecoveryCodes: prisma.totpRecoveryCode.count({ where: { userId } }),
    mfaLoginChallenges: prisma.mfaLoginChallenge.count({ where: { userId } }),
    passwordResetTokens: prisma.passwordResetToken.count({ where: { userId } }),
    payrollDocuments: prisma.payrollDocument.count({ where: { userId } }),
    payrollAdvanceLinks: prisma.payrollAdvanceLink.count({ where: { userId } }),
    payrollTransactionLinks: prisma.payrollTransactionLink.count({ where: { userId } }),
    annualEmploymentIncomeStatements: prisma.annualEmploymentIncomeStatement.count({ where: { userId } }),
    transactionCreateOperations: prisma.transactionCreateOperation.count({ where: { userId } }),
    investmentMutationRequests: prisma.investmentMutationRequest.count({ where: { userId } }),
  };

  const entries = await Promise.all(
    Object.entries(queries).map(async ([key, query]) => [key, await query] as const),
  );

  return Object.fromEntries(entries);
}

describe("user deletion cascade", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("removes owned records across financial, security, fiscal and payroll domains", async () => {
    const suffix = randomUUID();
    const uniqueHash = hash64(suffix);

    const user = await prisma.user.create({
      data: {
        name: "Usuário de teste",
        email: "delete-" + suffix + "@example.com",
        password: "hash-de-teste",
      },
    });

    const sourceAccount = await prisma.account.create({
      data: {
        name: ("Conta " + suffix).slice(0, 100),
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: user.id,
      },
    });
    const cardAccount = await prisma.account.create({
      data: {
        name: ("Cartão " + suffix).slice(0, 100),
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: user.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: ("Categoria " + suffix).slice(0, 50),
        type: "EXPENSE",
        userId: user.id,
      },
    });

    const incomeCategory = await prisma.category.create({
      data: {
        name: ("Receita " + suffix).slice(0, 50),
        type: "INCOME",
        userId: user.id,
      },
    });

    await prisma.categoryMonthlyLimit.create({
      data: {
        amount: 50_000,
        year: 2026,
        month: 10,
        userId: user.id,
        categoryId: category.id,
      },
    });

    await prisma.transactionImportRule.create({
      data: {
        name: ("Regra " + suffix).slice(0, 100),
        transactionType: "EXPENSE",
        descriptionOperator: "CONTAINS",
        descriptionPattern: "mercado",
        userId: user.id,
        accountId: sourceAccount.id,
        categoryId: category.id,
      },
    });

    const series = await prisma.transactionSeries.create({
      data: {
        anchorDay: 7,
        startYear: 2026,
        startMonth: 10,
        startDay: 7,
        endYear: 2027,
        endMonth: 9,
        endDay: 7,
        occurrenceCount: 12,
        userId: user.id,
      },
    });

    const merchant = await prisma.merchant.create({
      data: {
        name: ("Mercado " + suffix).slice(0, 120),
        userId: user.id,
      },
    });
    const alias = await prisma.merchantAlias.create({
      data: {
        pattern: "MERCADO TESTE",
        normalizedPattern: "mercado teste",
        operator: "CONTAINS",
        userId: user.id,
        merchantId: merchant.id,
      },
    });
    await prisma.merchantAliasEvent.create({
      data: {
        action: "CREATED",
        aliasId: alias.id,
        targetMerchantId: merchant.id,
        operator: "CONTAINS",
        pattern: alias.pattern,
        normalizedPattern: alias.normalizedPattern,
        userId: user.id,
      },
    });

    const sourceTransaction = await prisma.transaction.create({
      data: {
        amount: 10_000,
        month: 10,
        year: 2026,
        day: 7,
        type: "EXPENSE",
        description: "Pagamento",
        status: "COMPLETED",
        accountId: sourceAccount.id,
        categoryId: category.id,
        merchantId: merchant.id,
        seriesId: series.id,
        seriesIndex: 0,
        userId: user.id,
      },
    });
    const payrollTransaction = await prisma.transaction.create({
      data: {
        amount: 20_000,
        month: 10,
        year: 2026,
        day: 8,
        type: "INCOME",
        description: "Salário",
        status: "COMPLETED",
        accountId: sourceAccount.id,
        categoryId: incomeCategory.id,
        userId: user.id,
      },
    });

    await prisma.transactionCreateOperation.create({
      data: {
        idempotencyKeyHash: "f".repeat(64),
        requestHash: "e".repeat(64),
        userId: user.id,
        transactionId: payrollTransaction.id,
      },
    });

    const tag = await prisma.tag.create({
      data: {
        name: ("Tag " + suffix).slice(0, 50),
        normalizedName: ("tag-" + suffix).slice(0, 50),
        userId: user.id,
      },
    });
    await prisma.transactionTag.create({
      data: {
        userId: user.id,
        transactionId: sourceTransaction.id,
        tagId: tag.id,
      },
    });
    await prisma.transactionAllocation.create({
      data: {
        amount: 10_000,
        userId: user.id,
        transactionId: sourceTransaction.id,
        categoryId: category.id,
      },
    });
    await prisma.transactionTemplate.create({
      data: {
        name: ("Modelo " + suffix).slice(0, 80),
        type: "EXPENSE",
        amount: 10_000,
        userId: user.id,
        accountId: sourceAccount.id,
        categoryId: category.id,
      },
    });
    await prisma.accountReconciliationEvent.create({
      data: {
        action: "CONFIRMED",
        batchReconciledAt: new Date(),
        transactionCount: 1,
        userId: user.id,
        accountId: sourceAccount.id,
      },
    });
    await prisma.subscriptionReview.create({
      data: {
        patternId: "s".repeat(24),
        status: "CONFIRMED",
        userId: user.id,
      },
    });
    await prisma.recurrencePatternReview.create({
      data: {
        patternId: "r".repeat(24),
        signature: "signature-" + suffix,
        status: "CONFIRMED",
        seriesId: series.id,
        userId: user.id,
      },
    });

    await prisma.transfer.create({
      data: {
        userId: user.id,
        idempotencyKeyHash: "1".repeat(64),
        requestHash: "2".repeat(64),
      },
    });

    await prisma.creditCardPayment.create({
      data: {
        amount: 10_000,
        closingYear: 2026,
        closingMonth: 10,
        closingDay: 5,
        idempotencyKeyHash: "3".repeat(64),
        requestHash: "4".repeat(64),
        userId: user.id,
        cardAccountId: cardAccount.id,
        sourceAccountId: sourceAccount.id,
        sourceTransactionId: sourceTransaction.id,
      },
    });

    const goal = await prisma.financialGoal.create({
      data: {
        name: ("Meta " + suffix).slice(0, 100),
        targetAmount: 100_000,
        userId: user.id,
        accountId: sourceAccount.id,
      },
    });
    await prisma.financialGoalEntry.create({
      data: {
        type: "CONTRIBUTION",
        amount: 10_000,
        userId: user.id,
        goalId: goal.id,
        idempotencyKeyHash: "5".repeat(64),
        requestHash: "6".repeat(64),
      },
    });

    await prisma.exchangeRate.create({
      data: {
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 500,
        denominator: 100,
        referenceYear: 2026,
        referenceMonth: 10,
        referenceDay: 7,
        userId: user.id,
      },
    });

    const debt = await prisma.debt.create({
      data: {
        name: ("Dívida " + suffix).slice(0, 100),
        balance: 50_000,
        userId: user.id,
      },
    });
    await prisma.debtAdjustment.create({
      data: {
        previousBalance: 60_000,
        newBalance: 50_000,
        delta: -10_000,
        userId: user.id,
        debtId: debt.id,
        idempotencyKeyHash: "7".repeat(64),
        requestHash: "8".repeat(64),
      },
    });

    await prisma.periodicFinancialSummary.create({
      data: {
        currency: "BRL",
        periodStartYear: 2026,
        periodStartMonth: 10,
        periodStartDay: 1,
        periodEndYear: 2026,
        periodEndMonth: 10,
        periodEndDay: 7,
        content: { summary: "Resumo" },
        userId: user.id,
      },
    });

    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: "TST" + suffix.slice(0, 4),
        name: "Ativo teste",
        type: "STOCK",
        currency: "BRL",
        userId: user.id,
      },
    });

    await prisma.investmentMutationRequest.create({
      data: {
        scope: "operation:create",
        idempotencyKeyHash: "2".repeat(64),
        requestHash: "3".repeat(64),
        resourceId: asset.id,
        userId: user.id,
      },
    });
    const operation = await prisma.investmentOperation.create({
      data: {
        type: "BUY",
        quantityUnits: BigInt(1_000_000),
        unitPriceCents: 1_000,
        year: 2026,
        month: 10,
        day: 7,
        userId: user.id,
        accountId: sourceAccount.id,
        assetId: asset.id,
      },
    });
    const income = await prisma.investmentIncome.create({
      data: {
        type: "DIVIDEND",
        quantityUnits: BigInt(1_000_000),
        unitValueCents: 100,
        netAmountCents: 100,
        year: 2026,
        month: 10,
        day: 7,
        userId: user.id,
        accountId: sourceAccount.id,
        assetId: asset.id,
      },
    });
    await prisma.investmentFiscalEvent.create({
      data: {
        type: "BUY",
        originalType: "BUY",
        quantityUnits: BigInt(1_000_000),
        year: 2026,
        month: 10,
        day: 7,
        userId: user.id,
        accountId: sourceAccount.id,
        assetId: asset.id,
        operationId: operation.id,
      },
    });
    await prisma.investmentFiscalCostAdjustment.create({
      data: {
        quantityUnits: BigInt(1_000_000),
        costBasisCents: 1_000,
        year: 2026,
        month: 10,
        day: 7,
        reason: "Ajuste teste",
        userId: user.id,
        assetId: asset.id,
      },
    });
    await prisma.investmentTaxLossAdjustment.create({
      data: {
        assetType: "STOCK",
        currency: "BRL",
        amountCents: 100,
        year: 2026,
        month: 10,
        reason: "Ajuste teste",
        userId: user.id,
      },
    });
    const withholding = await prisma.investmentTaxWithholding.create({
      data: {
        assetType: "STOCK",
        currency: "BRL",
        amountCents: 10,
        year: 2026,
        month: 10,
        day: 7,
        source: "MANUAL",
        userId: user.id,
        assetId: asset.id,
      },
    });
    await prisma.investmentTaxPayment.create({
      data: {
        assetType: "STOCK",
        currency: "BRL",
        amountCents: 50,
        competenceYear: 2026,
        competenceMonth: 10,
        code: "6015",
        paidYear: 2026,
        paidMonth: 10,
        paidDay: 7,
        userId: user.id,
      },
    });
    await prisma.investmentForeignTaxPaid.create({
      data: {
        countryCode: "US",
        currency: "USD",
        amountCents: 10,
        paidYear: 2026,
        paidMonth: 10,
        paidDay: 7,
        eligibilityBasis: "RECIPROCITY",
        nonRefundableConfirmed: true,
        userId: user.id,
        assetId: asset.id,
        incomeId: income.id,
      },
    });
    await prisma.investmentBrokerageTaxReview.create({
      data: {
        importFingerprint: "9".repeat(64),
        noteNumber: "123",
        sourceInstitution: "Corretora",
        amountCents: 10,
        year: 2026,
        month: 10,
        day: 7,
        reason: "Revisão teste",
        userId: user.id,
        resolvedWithholdingId: withholding.id,
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });
    await prisma.investmentFiscalPendingResolution.create({
      data: {
        year: 2026,
        pendingKey: "pending-" + suffix,
        fingerprint: "a".repeat(64),
        justification: "Resolvido em teste",
        userId: user.id,
      },
    });
    await prisma.annualFinancialTaxStatement.create({
      data: {
        calendarYear: 2026,
        sourceInstitution: "Corretora",
        documentType: "INFORME",
        positions: [],
        incomes: [],
        taxWithholdings: [],
        notes: [],
        warnings: [],
        importFingerprint: "b".repeat(64),
        userId: user.id,
      },
    });

    await prisma.mcpAccessToken.create({
      data: {
        name: "Token teste",
        tokenHash: uniqueHash,
        tokenPrefix: "mcp_delete",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        userId: user.id,
      },
    });
    await prisma.totpRecoveryCode.create({
      data: {
        codeHash: "c".repeat(64),
        userId: user.id,
      },
    });
    await prisma.mfaLoginChallenge.create({
      data: {
        jtiHash: "d".repeat(64),
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        userId: user.id,
      },
    });
    await prisma.passwordResetToken.create({
      data: {
        token: "e".repeat(64),
        userId: user.id,
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      },
    });

    const payrollAdvance = await prisma.payrollDocument.create({
      data: {
        documentType: "PAYROLL_ADVANCE",
        paymentType: "ADVANCE",
        employerName: "Empresa teste",
        employerCnpj: "00.000.000/0001-00",
        year: 2026,
        month: 10,
        earnings: [],
        deductions: [],
        warnings: [],
        importFingerprint: "f".repeat(64),
        userId: user.id,
      },
    });
    const payrollRegular = await prisma.payrollDocument.create({
      data: {
        documentType: "MONTHLY_PAYSLIP",
        paymentType: "REGULAR",
        employerName: "Empresa teste",
        employerCnpj: "00.000.000/0001-00",
        year: 2026,
        month: 10,
        earnings: [],
        deductions: [],
        warnings: [],
        importFingerprint: "0".repeat(64),
        userId: user.id,
      },
    });
    await prisma.payrollAdvanceLink.create({
      data: {
        status: "MATCHED",
        compensationCents: 5_000,
        evidence: { source: "test" },
        userId: user.id,
        advanceDocumentId: payrollAdvance.id,
        regularDocumentId: payrollRegular.id,
      },
    });
    await prisma.payrollTransactionLink.create({
      data: {
        matchedAmountCents: 20_000,
        userId: user.id,
        payrollDocumentId: payrollRegular.id,
        transactionId: payrollTransaction.id,
      },
    });
    await prisma.annualEmploymentIncomeStatement.create({
      data: {
        calendarYear: 2026,
        taxExercise: 2027,
        payerName: "Empresa teste",
        payerTaxId: "00.000.000/0001-00",
        exemptIncome: [],
        exclusiveTaxation: [],
        accumulatedIncome: [],
        notes: [],
        warnings: [],
        importFingerprint: "1".repeat(64),
        userId: user.id,
      },
    });

    const before = await ownedCounts(user.id);
    expect(Object.values(before).every((count) => count > 0)).toBe(true);

    await deleteUser(user.id);

    const after = await ownedCounts(user.id);
    expect(after).toEqual(
      Object.fromEntries(Object.keys(after).map((key) => [key, 0])),
    );
  });
});
