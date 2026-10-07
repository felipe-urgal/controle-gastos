import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  archivePayrollDocument,
  confirmPayrollImport,
  persistPayrollImportAtomically,
} from "@/app/lib/payroll/payroll-import";
import type { ParsedPayrollDocument } from "@/app/lib/payroll/payroll-parser";
import { payrollImportFingerprint } from "@/app/lib/payroll/payroll-parser";
import { signPayrollPreview } from "@/app/lib/payroll/preview-token";
import { getPayrollCompetenceSummaries } from "@/app/lib/payroll/payroll-reconciliation";
import { getPayrollTransactionReconciliationForUser } from "@/app/lib/payroll/payroll-transaction-reconciliation";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function user(label: string) {
  const suffix = randomUUID();
  const created = await prisma.user.create({
    data: {
      name: label,
      email: `payroll-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(created.id);
  return created;
}

function document(): ParsedPayrollDocument {
  return {
    documentType: "MONTHLY_PAYSLIP",
    paymentType: "REGULAR",
    employerName: "Empresa Teste",
    employerCnpj: "12.345.678/0001-90",
    employeeName: "Pessoa Teste",
    year: 2026,
    month: 9,
    salaryBaseCents: 724228,
    grossIncomeCents: 724228,
    totalEarningsCents: 724228,
    totalDeductionsCents: 374733,
    netPaidCents: 349495,
    inssCents: 87724,
    irrfCents: 120000,
    irrfBaseCents: 636504,
    fgtsBaseCents: 724228,
    fgtsAmountCents: 57938,
    earnings: [],
    deductions: [],
    bankMetadata: null,
    warnings: [],
    errors: [],
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/payroll/import/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("payroll import integration", () => {
  it("persists a payroll document idempotently without creating transactions", async () => {
    const owner = await user("Payroll Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({ userId: owner.id, document: previewDocument });

    const response = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));
    expect(response.status).toBe(201);
    expect(await prisma.payrollDocument.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);

    const second = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));
    expect([200, 201]).toContain(second.status);
    expect(await prisma.payrollDocument.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("treats concurrent confirmations of the same preview as one import", async () => {
    const owner = await user("Payroll Concurrent Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({
      userId: owner.id,
      document: previewDocument,
    });
    const body = {
      previewToken,
      selected: true,
      document: previewDocument,
    };

    const [left, right] = await Promise.all([
      confirmPayrollImport(request(body)),
      confirmPayrollImport(request(body)),
    ]);

    expect([200, 201]).toContain(left.status);
    expect([200, 201]).toContain(right.status);

    const [leftBody, rightBody] = await Promise.all([left.json(), right.json()]);
    expect(leftBody.success).toBe(true);
    expect(rightBody.success).toBe(true);
    expect(leftBody.data.id).toBe(rightBody.data.id);
    expect(
      await prisma.payrollDocument.count({ where: { userId: owner.id } }),
    ).toBe(1);
  });

  it.each(["THIRTEENTH", "VACATION", "PLR", "OTHER"] as const)(
    "allows explicit %s classification before confirmation",
    async (paymentType) => {
      const owner = await user("Payroll Classification Owner");
      authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

      const parsed = document();
      const previewDocument = {
        ...parsed,
        fingerprint: payrollImportFingerprint(owner.id, parsed),
        duplicate: false,
      };
      const previewToken = signPayrollPreview({
        userId: owner.id,
        document: previewDocument,
      });

      const response = await confirmPayrollImport(request({
        previewToken,
        selected: true,
        document: previewDocument,
        paymentType,
      }));
      expect(response.status).toBe(201);

      const stored = await prisma.payrollDocument.findFirstOrThrow({
        where: { userId: owner.id },
      });
      expect(stored.paymentType).toBe(paymentType);
      expect(stored.importFingerprint).not.toBe(previewDocument.fingerprint);
      expect(await getPayrollCompetenceSummaries(owner.id)).toEqual([]);
    },
  );

  it("rejects payment classifications incompatible with the document type", async () => {
    const owner = await user("Payroll Invalid Classification Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({
      userId: owner.id,
      document: previewDocument,
    });

    const response = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
      paymentType: "ADVANCE",
    }));

    expect(response.status).toBe(400);
    expect(
      await prisma.payrollDocument.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("rolls back the document when derived reconciliation fails", async () => {
    const owner = await user("Payroll Atomic Owner");
    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };

    await expect(
      persistPayrollImportAtomically({
        userId: owner.id,
        document: previewDocument,
        supersedesId: null,
        reconcile: async () => {
          throw new Error("FORCED_RECONCILIATION_FAILURE");
        },
      }),
    ).rejects.toThrow("FORCED_RECONCILIATION_FAILURE");

    expect(
      await prisma.payrollDocument.count({ where: { userId: owner.id } }),
    ).toBe(0);
    expect(
      await prisma.payrollAdvanceLink.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("rolls back supersede state when derived reconciliation fails", async () => {
    const owner = await user("Payroll Atomic Supersede Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const original = document();
    const originalPreview = {
      ...original,
      fingerprint: payrollImportFingerprint(owner.id, original),
      duplicate: false,
    };
    const originalToken = signPayrollPreview({
      userId: owner.id,
      document: originalPreview,
    });
    const first = await confirmPayrollImport(request({
      previewToken: originalToken,
      selected: true,
      document: originalPreview,
    }));
    expect(first.status).toBe(201);

    const originalStored = await prisma.payrollDocument.findFirstOrThrow({
      where: {
        userId: owner.id,
        importFingerprint: originalPreview.fingerprint,
      },
    });

    const retified = {
      ...original,
      netPaidCents: original.netPaidCents! + 100,
    };
    const retifiedDocument = {
      ...retified,
      fingerprint: payrollImportFingerprint(owner.id, retified),
      duplicate: false,
    };

    await expect(
      persistPayrollImportAtomically({
        userId: owner.id,
        document: retifiedDocument,
        supersedesId: originalStored.id,
        reconcile: async () => {
          throw new Error("FORCED_RECONCILIATION_FAILURE");
        },
      }),
    ).rejects.toThrow("FORCED_RECONCILIATION_FAILURE");

    const versions = await prisma.payrollDocument.findMany({
      where: { userId: owner.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      id: originalStored.id,
      lifecycleStatus: "ACTIVE",
      supersededAt: null,
    });
  });

  it("imports a retified payslip when INSS or rubric content changes", async () => {
    const owner = await user("Payroll Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const original = {
      ...document(),
      deductions: [
        {
          code: "910",
          description: "I.N.S.S.",
          reference: "14",
          earningsCents: null,
          deductionsCents: 87724,
        },
      ],
    };
    const originalPreview = {
      ...original,
      fingerprint: payrollImportFingerprint(owner.id, original),
      duplicate: false,
    };
    const originalToken = signPayrollPreview({
      userId: owner.id,
      document: originalPreview,
    });

    const first = await confirmPayrollImport(request({
      previewToken: originalToken,
      selected: true,
      document: originalPreview,
    }));
    expect(first.status).toBe(201);

    const retified = {
      ...original,
      inssCents: 87725,
      deductions: [
        {
          ...original.deductions[0]!,
          deductionsCents: 87725,
        },
      ],
    };
    const retifiedPreview = {
      ...retified,
      fingerprint: payrollImportFingerprint(owner.id, retified),
      duplicate: false,
    };
    const retifiedToken = signPayrollPreview({
      userId: owner.id,
      document: retifiedPreview,
    });

    expect(retifiedPreview.fingerprint).not.toBe(originalPreview.fingerprint);

    const second = await confirmPayrollImport(request({
      previewToken: retifiedToken,
      selected: true,
      document: retifiedPreview,
    }));
    expect(second.status).toBe(201);

    const stored = await prisma.payrollDocument.findMany({
      where: { userId: owner.id },
      orderBy: { createdAt: "asc" },
    });
    expect(stored).toHaveLength(2);
    expect(stored.map((item) => item.inssCents)).toEqual([87724, 87725]);
  });

  it("supersedes and archives payroll versions without leaving stale derived links", async () => {
    const owner = await user("Payroll Lifecycle Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const original = document();
    const originalPreview = {
      ...original,
      fingerprint: payrollImportFingerprint(owner.id, original),
      duplicate: false,
    };
    const originalToken = signPayrollPreview({
      userId: owner.id,
      document: originalPreview,
    });

    const first = await confirmPayrollImport(request({
      previewToken: originalToken,
      selected: true,
      document: originalPreview,
    }));
    expect(first.status).toBe(201);

    const originalStored = await prisma.payrollDocument.findFirstOrThrow({
      where: { userId: owner.id, importFingerprint: originalPreview.fingerprint },
    });

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: "Conta lifecycle " + randomUUID(),
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: "Salário " + randomUUID().slice(0, 8),
          type: "INCOME",
          userId: owner.id,
        },
      }),
    ]);
    const transaction = await prisma.transaction.create({
      data: {
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        amount: original.netPaidCents!,
        year: original.year,
        month: original.month,
        day: 30,
        type: "INCOME",
        kind: "NORMAL",
        status: "COMPLETED",
        description: "SALARIO LIFECYCLE",
      },
    });
    await prisma.payrollTransactionLink.create({
      data: {
        userId: owner.id,
        payrollDocumentId: originalStored.id,
        transactionId: transaction.id,
        matchedAmountCents: original.netPaidCents!,
      },
    });

    const retified = {
      ...original,
      inssCents: (original.inssCents ?? 0) + 1,
      netPaidCents: (original.netPaidCents ?? 0) + 100,
    };
    const retifiedPreview = {
      ...retified,
      fingerprint: payrollImportFingerprint(owner.id, retified),
      duplicate: false,
    };
    const retifiedToken = signPayrollPreview({
      userId: owner.id,
      document: retifiedPreview,
    });

    const second = await confirmPayrollImport(request({
      previewToken: retifiedToken,
      selected: true,
      document: retifiedPreview,
      supersedesId: originalStored.id,
    }));
    expect(second.status).toBe(201);

    const versions = await prisma.payrollDocument.findMany({
      where: { userId: owner.id },
      orderBy: { createdAt: "asc" },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({
      id: originalStored.id,
      lifecycleStatus: "SUPERSEDED",
    });
    expect(versions[0]?.supersededAt).not.toBeNull();
    expect(versions[1]).toMatchObject({
      lifecycleStatus: "ACTIVE",
      supersedesId: originalStored.id,
    });
    expect(
      await prisma.payrollTransactionLink.count({
        where: { payrollDocumentId: originalStored.id },
      }),
    ).toBe(0);

    const summaries = await getPayrollCompetenceSummaries(owner.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      documentCount: 1,
      netPaidCents: retified.netPaidCents,
    });

    const bankReconciliation =
      await getPayrollTransactionReconciliationForUser(owner.id);
    expect(bankReconciliation).toHaveLength(1);
    expect(bankReconciliation[0]?.documentId).toBe(versions[1]!.id);

    const archived = await archivePayrollDocument(
      new Request("http://localhost/api/payroll/archive", { method: "POST" }),
      { params: Promise.resolve({ id: versions[1]!.id }) },
    );
    expect(archived.status).toBe(200);

    const archivedVersion = await prisma.payrollDocument.findUniqueOrThrow({
      where: { id: versions[1]!.id },
    });
    expect(archivedVersion.lifecycleStatus).toBe("ARCHIVED");
    expect(archivedVersion.archivedAt).not.toBeNull();
    expect(await getPayrollCompetenceSummaries(owner.id)).toEqual([]);
    expect(await getPayrollTransactionReconciliationForUser(owner.id)).toEqual([]);
  });

  it("does not accept another user's signed preview", async () => {
    const owner = await user("Payroll Owner");
    const other = await user("Payroll Other");
    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({ userId: owner.id, document: previewDocument });

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const response = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));

    expect(response.status).toBe(400);
    expect(await prisma.payrollDocument.count({ where: { userId: other.id } })).toBe(0);
  });
});
