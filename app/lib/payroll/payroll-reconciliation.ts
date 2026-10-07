import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

type PayrollRubric = {
  description?: unknown;
  deductionsCents?: unknown;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function compensationValues(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const rubric = item as PayrollRubric;
    const description = typeof rubric.description === "string" ? rubric.description : "";
    const amount = typeof rubric.deductionsCents === "number" ? rubric.deductionsCents : null;
    if (
      amount === null ||
      !/(DESC.*ADIANT.*SALAR|ADIANTAMENTO SALARIAL|ADIANT.*SALAR)/.test(fold(description))
    ) {
      return [];
    }
    return [{ description, amount }];
  });
}

type CentsAggregation = {
  value: number | null;
  complete: boolean;
};

function aggregateCents<T>(items: T[], valueOf: (item: T) => number | null): CentsAggregation {
  if (items.length === 0) {
    return { value: 0, complete: true };
  }

  let total = 0;
  for (const item of items) {
    const value = valueOf(item);
    if (value === null) {
      return { value: null, complete: false };
    }
    total += value;
  }

  return { value: total, complete: true };
}

type PayrollReconciliationDb = Pick<
  Prisma.TransactionClient,
  "payrollDocument" | "payrollAdvanceLink"
>;

export async function reconcilePayrollCompetence(
  params: {
    userId: string;
    employerCnpj: string;
    year: number;
    month: number;
  },
  db: PayrollReconciliationDb = prisma,
) {
  const documents = await db.payrollDocument.findMany({
    where: {
      userId: params.userId,
      employerCnpj: params.employerCnpj,
      year: params.year,
      month: params.month,
      lifecycleStatus: "ACTIVE",
    },
    select: {
      id: true,
      documentType: true,
      grossIncomeCents: true,
      totalEarningsCents: true,
      deductions: true,
    },
  });

  const advances = documents.filter((item) => item.documentType === "PAYROLL_ADVANCE");
  const regulars = documents.filter((item) => item.documentType === "MONTHLY_PAYSLIP");

  if (regulars.length === 0) {
    if (advances.length > 0) {
      await db.payrollAdvanceLink.deleteMany({
        where: { userId: params.userId, advanceDocumentId: { in: advances.map((item) => item.id) } },
      });
    }
    return;
  }

  const regularCompensations = regulars.flatMap((regular) =>
    compensationValues(regular.deductions).map((rubric) => ({
      regularDocumentId: regular.id,
      ...rubric,
    })),
  );

  for (const advance of advances) {
    const expected = advance.totalEarningsCents ?? advance.grossIncomeCents;
    const matches = expected === null
      ? []
      : regularCompensations.filter((item) => item.amount === expected);

    if (matches.length === 1) {
      const match = matches[0];
      const sameAmountAdvances = advances.filter(
        (item) => (item.totalEarningsCents ?? item.grossIncomeCents) === expected,
      );

      if (sameAmountAdvances.length === 1) {
        await db.payrollAdvanceLink.upsert({
          where: { advanceDocumentId: advance.id },
          create: {
            userId: params.userId,
            advanceDocumentId: advance.id,
            regularDocumentId: match.regularDocumentId,
            status: "MATCHED",
            compensationCents: match.amount,
            reason: null,
            evidence: {
              employerCnpj: params.employerCnpj,
              year: params.year,
              month: params.month,
              rubric: match.description,
              expectedAdvanceCents: expected,
            },
          },
          update: {
            regularDocumentId: match.regularDocumentId,
            status: "MATCHED",
            compensationCents: match.amount,
            reason: null,
            evidence: {
              employerCnpj: params.employerCnpj,
              year: params.year,
              month: params.month,
              rubric: match.description,
              expectedAdvanceCents: expected,
            },
          },
        });
        continue;
      }
    }

    await db.payrollAdvanceLink.upsert({
      where: { advanceDocumentId: advance.id },
      create: {
        userId: params.userId,
        advanceDocumentId: advance.id,
        status: "PENDING",
        compensationCents: null,
        reason:
          matches.length > 1
            ? "Mais de uma folha/rubrica pode compensar este adiantamento."
            : expected !== null && advances.filter(
                (item) => (item.totalEarningsCents ?? item.grossIncomeCents) === expected,
              ).length > 1
              ? "Mais de um adiantamento possui o mesmo valor na competência."
              : "Nenhuma rubrica de compensação compatível foi encontrada.",
        evidence: {
          employerCnpj: params.employerCnpj,
          year: params.year,
          month: params.month,
          expectedAdvanceCents: expected,
          candidateCompensations: regularCompensations,
        },
      },
      update: {
        regularDocumentId: null,
        status: "PENDING",
        compensationCents: null,
        reason:
          matches.length > 1
            ? "Mais de uma folha/rubrica pode compensar este adiantamento."
            : expected !== null && advances.filter(
                (item) => (item.totalEarningsCents ?? item.grossIncomeCents) === expected,
              ).length > 1
              ? "Mais de um adiantamento possui o mesmo valor na competência."
              : "Nenhuma rubrica de compensação compatível foi encontrada.",
        evidence: {
          employerCnpj: params.employerCnpj,
          year: params.year,
          month: params.month,
          expectedAdvanceCents: expected,
          candidateCompensations: regularCompensations,
        },
      },
    });
  }
}

export async function getPayrollCompetenceSummaries(userId: string) {
  const documents = await prisma.payrollDocument.findMany({
    where: { userId, lifecycleStatus: "ACTIVE" },
    orderBy: [{ year: "desc" }, { month: "desc" }, { employerCnpj: "asc" }],
    include: {
      advanceLinks: true,
    },
  });

  const groups = new Map<string, typeof documents>();
  for (const document of documents) {
    const key = [document.employerCnpj, document.year, document.month].join("|");
    const current = groups.get(key) ?? [];
    current.push(document);
    groups.set(key, current);
  }

  return [...groups.values()].map((items) => {
    const regulars = items.filter((item) => item.documentType === "MONTHLY_PAYSLIP");
    const advances = items.filter((item) => item.documentType === "PAYROLL_ADVANCE");
    const links = advances.flatMap((item) => item.advanceLinks);
    const grossIncome = aggregateCents(
      regulars.length > 0 ? regulars : advances,
      (item) => item.grossIncomeCents ?? item.totalEarningsCents,
    );
    const netPaid = aggregateCents(items, (item) => item.netPaidCents);
    const irrf = aggregateCents(items, (item) => item.irrfCents);
    const advanceNetPaid = aggregateCents(advances, (item) => item.netPaidCents);
    const regularNetPaid = aggregateCents(regulars, (item) => item.netPaidCents);

    return {
      employerName: items[0]?.employerName ?? "",
      employerCnpj: items[0]?.employerCnpj ?? "",
      year: items[0]?.year ?? 0,
      month: items[0]?.month ?? 0,
      grossIncomeCents: grossIncome.value,
      grossIncomeComplete: grossIncome.complete,
      netPaidCents: netPaid.value,
      netPaidComplete: netPaid.complete,
      irrfCents: irrf.value,
      irrfComplete: irrf.complete,
      advanceNetPaidCents: advanceNetPaid.value,
      advanceNetPaidComplete: advanceNetPaid.complete,
      regularNetPaidCents: regularNetPaid.value,
      regularNetPaidComplete: regularNetPaid.complete,
      matchedAdvances: links.filter((item) => item.status === "MATCHED").length,
      pendingAdvances: links.filter((item) => item.status === "PENDING").length,
      documentCount: items.length,
    };
  });
}
