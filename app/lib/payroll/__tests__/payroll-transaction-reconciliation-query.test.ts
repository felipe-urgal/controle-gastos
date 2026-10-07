import { describe, expect, it, vi } from "vitest";

import { getPayrollTransactionReconciliationForUser } from "@/app/lib/payroll/payroll-transaction-reconciliation";

type ReconciliationDb = NonNullable<
  Parameters<typeof getPayrollTransactionReconciliationForUser>[2]
>;

function document(index: number) {
  const year = 2021 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return {
    id: "document-" + index,
    documentType: "MONTHLY_PAYSLIP" as const,
    paymentType: "REGULAR" as const,
    employerName: "Empresa Teste",
    employerCnpj: "12.345.678/0001-90",
    year,
    month,
    netPaidCents: 300_000 + index,
    bankMetadata: null,
    createdAt: new Date(Date.UTC(year, month - 1, 1)),
    transactionLink: null,
  };
}

function candidate(args: {
  id: string;
  amount: number;
  year: number;
  month: number;
  accountName: string;
}) {
  return {
    id: args.id,
    amount: args.amount,
    type: "INCOME" as const,
    status: "COMPLETED" as const,
    description: "SALARIO",
    year: args.year,
    month: args.month,
    day: 5,
    createdAt: new Date(Date.UTC(args.year, args.month - 1, 5)),
    reconciliationStatus: "UNRECONCILED" as const,
    account: {
      id: "account-" + args.id,
      name: args.accountName,
      type: "CREDIT_DEBIT" as const,
      currency: "BRL",
    },
  };
}

describe("payroll bank reconciliation query budget", () => {
  it("uses one document query and at most one candidate query for many years", async () => {
    const documents = Array.from({ length: 60 }, (_, index) => document(index));
    const payrollFindMany = vi.fn().mockResolvedValue(documents);
    const transactionFindMany = vi.fn().mockResolvedValue([]);

    const db = {
      payrollDocument: { findMany: payrollFindMany },
      transaction: { findMany: transactionFindMany },
    } as unknown as ReconciliationDb;

    const items = await getPayrollTransactionReconciliationForUser(
      "user-1",
      {},
      db,
    );

    expect(items).toHaveLength(60);
    expect(payrollFindMany).toHaveBeenCalledTimes(1);
    expect(transactionFindMany).toHaveBeenCalledTimes(1);
  });

  it("uses bank metadata only to rank and explain ambiguous candidates", async () => {
    const payrollFindMany = vi.fn().mockResolvedValue([
      {
        ...document(0),
        year: 2026,
        month: 9,
        netPaidCents: 349_495,
        bankMetadata: {
          bank: "Banco Azul",
          agency: "1234",
          account: "56789-0",
        },
      },
    ]);
    const transactionFindMany = vi.fn().mockResolvedValue([
      candidate({
        id: "weak",
        amount: 349_495,
        year: 2026,
        month: 9,
        accountName: "Conta principal",
      }),
      candidate({
        id: "ranked",
        amount: 349_495,
        year: 2026,
        month: 9,
        accountName: "Banco Azul - Conta salário",
      }),
    ]);

    const db = {
      payrollDocument: { findMany: payrollFindMany },
      transaction: { findMany: transactionFindMany },
    } as unknown as ReconciliationDb;

    const [item] = await getPayrollTransactionReconciliationForUser(
      "user-1",
      {},
      db,
    );

    expect(item).toMatchObject({
      status: "REVIEW_REQUIRED",
      matchedTransaction: null,
    });
    expect(item?.candidates).toHaveLength(2);
    expect(item?.candidates[0]).toMatchObject({
      id: "ranked",
      evidence: {
        bankNameMatch: true,
        score: 1,
      },
    });
    expect(item?.reason).toContain("nunca confirmar automaticamente");
    expect(payrollFindMany).toHaveBeenCalledTimes(1);
    expect(transactionFindMany).toHaveBeenCalledTimes(1);
  });
});
