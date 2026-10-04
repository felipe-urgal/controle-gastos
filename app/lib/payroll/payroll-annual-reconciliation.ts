import { Prisma } from "@prisma/client";
import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type PayrollAnnualReconciliationStatus =
  | "MATCHED"
  | "MISMATCH"
  | "INCOMPLETE"
  | "UNSUPPORTED_COMPONENT";

export type PayrollAnnualReconciliationComponentKey =
  | "TAXABLE_INCOME"
  | "OFFICIAL_PENSION"
  | "IRRF"
  | "THIRTEENTH_SALARY"
  | "THIRTEENTH_IRRF"
  | "PLR"
  | "VACATION_ABONO"
  | "MONTHLY_COVERAGE";

export type PayrollAnnualReconciliationSource = {
  documentId: string;
  month: number;
  paymentType: string;
  amountCents: number | null;
  rubrics: Array<{
    code: string | null;
    description: string;
    earningsCents: number | null;
    deductionsCents: number | null;
  }>;
};

export type PayrollAnnualReconciliationComponent = {
  key: PayrollAnnualReconciliationComponentKey;
  label: string;
  status: PayrollAnnualReconciliationStatus;
  payrollCents: number | null;
  statementCents: number | null;
  differenceCents: number | null;
  reason: string | null;
  sources: PayrollAnnualReconciliationSource[];
};

export type PayrollAnnualReconciliationGroup = {
  employerName: string;
  employerCnpj: string;
  year: number;
  status: PayrollAnnualReconciliationStatus;
  statementIds: string[];
  documentCount: number;
  components: PayrollAnnualReconciliationComponent[];
};

export type PayrollAnnualReconciliationReport = {
  year: number;
  status: "MATCHED" | "REVIEW_REQUIRED";
  summary: {
    groups: number;
    matchedGroups: number;
    reviewGroups: number;
    matchedComponents: number;
    reviewComponents: number;
  };
  items: PayrollAnnualReconciliationGroup[];
};

type PayrollDocumentRecord = {
  id: string;
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  paymentType: string;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  earnings: Prisma.JsonValue;
  deductions: Prisma.JsonValue;
  advanceLinks: Array<{ status: string }>;
};

type AnnualStatementRecord = {
  id: string;
  payerName: string;
  payerTaxId: string;
  calendarYear: number;
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents: number | null;
  thirteenthIrrfCents: number | null;
  exemptIncome: Prisma.JsonValue;
  exclusiveTaxation: Prisma.JsonValue;
};

type Aggregate = {
  valueCents: number | null;
  complete: boolean;
  reason: string | null;
  sources: PayrollAnnualReconciliationSource[];
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeTaxId(value: string) {
  return value.replace(/\D/g, "");
}

function rubrics(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const description =
      typeof record.description === "string" ? record.description : "";
    if (!description) return [];
    return [{
      code: typeof record.code === "string" ? record.code : null,
      description,
      earningsCents:
        typeof record.earningsCents === "number" ? record.earningsCents : null,
      deductionsCents:
        typeof record.deductionsCents === "number" ? record.deductionsCents : null,
    }];
  });
}

function aggregateDocuments(
  documents: PayrollDocumentRecord[],
  amount: (document: PayrollDocumentRecord) => number | null,
): Aggregate {
  if (documents.length === 0) {
    return {
      valueCents: null,
      complete: false,
      reason: "Nenhum documento mensal aplicável foi importado.",
      sources: [],
    };
  }

  const sources = documents.map((document) => ({
    documentId: document.id,
    month: document.month,
    paymentType: document.paymentType,
    amountCents: amount(document),
    rubrics: [
      ...rubrics(document.earnings),
      ...rubrics(document.deductions),
    ],
  }));
  const missing = sources.filter((source) => source.amountCents === null);
  const valueCents = sources.reduce(
    (total, source) => total + (source.amountCents ?? 0),
    0,
  );

  return {
    valueCents: missing.length === sources.length ? null : valueCents,
    complete: missing.length === 0,
    reason:
      missing.length > 0
        ? "Há documento mensal sem o valor necessário para esta conciliação."
        : null,
    sources,
  };
}

function statementItems(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const description =
      typeof record.description === "string" ? record.description : "";
    if (!description) return [];
    return [{
      description,
      amountCents:
        typeof record.amountCents === "number" ? record.amountCents : null,
    }];
  });
}

function statementItemTotal(
  value: Prisma.JsonValue,
  matcher: (description: string) => boolean,
) {
  const matches = statementItems(value).filter((item) =>
    matcher(fold(item.description)),
  );
  if (matches.length === 0) {
    return { found: false, valueCents: null as number | null };
  }
  if (matches.some((item) => item.amountCents === null)) {
    return { found: true, valueCents: null as number | null };
  }
  return {
    found: true,
    valueCents: matches.reduce(
      (total, item) => total + (item.amountCents ?? 0),
      0,
    ),
  };
}

function buildComponent(args: {
  key: PayrollAnnualReconciliationComponentKey;
  label: string;
  payroll: Aggregate;
  statementCents: number | null;
  statementAvailable: boolean;
  blockingReason?: string | null;
  unsupportedReason?: string | null;
}): PayrollAnnualReconciliationComponent {
  const {
    key,
    label,
    payroll,
    statementCents,
    statementAvailable,
    blockingReason,
    unsupportedReason,
  } = args;

  if (unsupportedReason) {
    return {
      key,
      label,
      status: "UNSUPPORTED_COMPONENT",
      payrollCents: payroll.valueCents,
      statementCents,
      differenceCents: null,
      reason: unsupportedReason,
      sources: payroll.sources,
    };
  }

  if (!statementAvailable) {
    return {
      key,
      label,
      status: "INCOMPLETE",
      payrollCents: payroll.valueCents,
      statementCents: null,
      differenceCents: null,
      reason: blockingReason ?? "Informe anual ausente ou ambíguo para esta fonte pagadora.",
      sources: payroll.sources,
    };
  }

  if (blockingReason) {
    return {
      key,
      label,
      status: "INCOMPLETE",
      payrollCents: payroll.valueCents,
      statementCents,
      differenceCents: null,
      reason: blockingReason,
      sources: payroll.sources,
    };
  }

  if (!payroll.complete || payroll.valueCents === null) {
    return {
      key,
      label,
      status: "INCOMPLETE",
      payrollCents: payroll.valueCents,
      statementCents,
      differenceCents: null,
      reason: payroll.reason ?? "Documentos mensais insuficientes para esta conciliação.",
      sources: payroll.sources,
    };
  }

  if (statementCents === null) {
    return {
      key,
      label,
      status: "INCOMPLETE",
      payrollCents: payroll.valueCents,
      statementCents: null,
      differenceCents: null,
      reason: "O informe anual não trouxe este valor; ausência não foi tratada como zero.",
      sources: payroll.sources,
    };
  }

  const differenceCents = payroll.valueCents - statementCents;
  return {
    key,
    label,
    status: differenceCents === 0 ? "MATCHED" : "MISMATCH",
    payrollCents: payroll.valueCents,
    statementCents,
    differenceCents,
    reason:
      differenceCents === 0
        ? null
        : "O total calculado pelos documentos mensais diverge do informe anual.",
    sources: payroll.sources,
  };
}

function worstStatus(statuses: PayrollAnnualReconciliationStatus[]) {
  const priority: Record<PayrollAnnualReconciliationStatus, number> = {
    MATCHED: 0,
    UNSUPPORTED_COMPONENT: 1,
    INCOMPLETE: 2,
    MISMATCH: 3,
  };
  return statuses.reduce<PayrollAnnualReconciliationStatus>(
    (current, status) => priority[status] > priority[current] ? status : current,
    "MATCHED",
  );
}

function coverageReason(documents: PayrollDocumentRecord[]) {
  const regulars = documents.filter((item) => item.paymentType === "REGULAR");
  const monthCounts = new Map<number, number>();
  for (const document of regulars) {
    monthCounts.set(document.month, (monthCounts.get(document.month) ?? 0) + 1);
  }

  const missingMonths = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => !monthCounts.has(month));
  const duplicateMonths = [...monthCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([month]) => month);
  const pendingAdvances = documents.filter(
    (item) =>
      item.paymentType === "ADVANCE" &&
      item.advanceLinks.some((link) => link.status !== "MATCHED"),
  );

  const reasons: string[] = [];
  if (missingMonths.length > 0) {
    reasons.push(
      "Competências mensais ausentes: " +
        missingMonths.map((month) => String(month).padStart(2, "0")).join(", ") +
        ".",
    );
  }
  if (duplicateMonths.length > 0) {
    reasons.push(
      "Há mais de uma folha regular nas competências: " +
        duplicateMonths.map((month) => String(month).padStart(2, "0")).join(", ") +
        ".",
    );
  }
  if (pendingAdvances.length > 0) {
    reasons.push(
      pendingAdvances.length +
        " adiantamento(s) ainda não possuem vínculo confirmado com a folha mensal.",
    );
  }

  return reasons.length > 0 ? reasons.join(" ") : null;
}

export async function getPayrollAnnualReconciliationForUser(
  userId: string,
  year: number,
): Promise<PayrollAnnualReconciliationReport> {
  const [documents, statements] = await Promise.all([
    prisma.payrollDocument.findMany({
      where: { userId, year },
      orderBy: [{ employerCnpj: "asc" }, { month: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        employerName: true,
        employerCnpj: true,
        year: true,
        month: true,
        paymentType: true,
        grossIncomeCents: true,
        totalEarningsCents: true,
        inssCents: true,
        irrfCents: true,
        earnings: true,
        deductions: true,
        advanceLinks: {
          select: { status: true },
        },
      },
    }),
    prisma.annualEmploymentIncomeStatement.findMany({
      where: { userId, calendarYear: year },
      orderBy: [{ payerTaxId: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        payerName: true,
        payerTaxId: true,
        calendarYear: true,
        taxableIncomeCents: true,
        officialPensionCents: true,
        irrfCents: true,
        thirteenthSalaryCents: true,
        thirteenthIrrfCents: true,
        exemptIncome: true,
        exclusiveTaxation: true,
      },
    }),
  ]);

  const groups = new Map<
    string,
    {
      employerName: string;
      employerCnpj: string;
      documents: PayrollDocumentRecord[];
      statements: AnnualStatementRecord[];
    }
  >();

  for (const document of documents) {
    const key = normalizeTaxId(document.employerCnpj) || document.employerCnpj;
    const group = groups.get(key) ?? {
      employerName: document.employerName,
      employerCnpj: document.employerCnpj,
      documents: [],
      statements: [],
    };
    group.documents.push(document);
    groups.set(key, group);
  }

  for (const statement of statements) {
    const key = normalizeTaxId(statement.payerTaxId) || statement.payerTaxId;
    const group = groups.get(key) ?? {
      employerName: statement.payerName,
      employerCnpj: statement.payerTaxId,
      documents: [],
      statements: [],
    };
    if (group.documents.length === 0) {
      group.employerName = statement.payerName;
      group.employerCnpj = statement.payerTaxId;
    }
    group.statements.push(statement);
    groups.set(key, group);
  }

  const items = [...groups.values()].map<PayrollAnnualReconciliationGroup>((group) => {
    const statement = group.statements.length === 1 ? group.statements[0] : null;
    const statementAvailable = statement !== null;
    const statementIssue =
      group.statements.length > 1
        ? "Há mais de um informe anual para a mesma fonte pagadora e ano; nenhum foi escolhido silenciosamente."
        : group.statements.length === 0
          ? "Nenhum informe anual foi importado para esta fonte pagadora e ano."
          : null;
    const coverage = coverageReason(group.documents);

    const regularDocuments = group.documents.filter(
      (item) => item.paymentType === "REGULAR",
    );
    const pensionDocuments = group.documents.filter((item) =>
      ["REGULAR", "THIRTEENTH", "VACATION"].includes(item.paymentType),
    );
    const irrfDocuments = group.documents.filter((item) =>
      ["ADVANCE", "REGULAR", "VACATION"].includes(item.paymentType),
    );
    const thirteenthDocuments = group.documents.filter(
      (item) => item.paymentType === "THIRTEENTH",
    );
    const plrDocuments = group.documents.filter(
      (item) => item.paymentType === "PLR",
    );
    const vacationDocuments = group.documents.filter(
      (item) => item.paymentType === "VACATION",
    );

    const components: PayrollAnnualReconciliationComponent[] = [
      buildComponent({
        key: "TAXABLE_INCOME",
        label: "Rendimentos tributáveis",
        payroll: aggregateDocuments(
          regularDocuments,
          (document) => document.grossIncomeCents ?? document.totalEarningsCents,
        ),
        statementCents: statement?.taxableIncomeCents ?? null,
        statementAvailable,
        blockingReason: statementIssue ?? coverage,
      }),
      buildComponent({
        key: "OFFICIAL_PENSION",
        label: "Previdência oficial",
        payroll: aggregateDocuments(
          pensionDocuments,
          (document) => document.inssCents,
        ),
        statementCents: statement?.officialPensionCents ?? null,
        statementAvailable,
        blockingReason: statementIssue ?? coverage,
      }),
      buildComponent({
        key: "IRRF",
        label: "IRRF",
        payroll: aggregateDocuments(
          irrfDocuments,
          (document) => document.irrfCents,
        ),
        statementCents: statement?.irrfCents ?? null,
        statementAvailable,
        blockingReason: statementIssue ?? coverage,
      }),
    ];

    if (
      thirteenthDocuments.length > 0 ||
      statement?.thirteenthSalaryCents !== null
    ) {
      components.push(
        buildComponent({
          key: "THIRTEENTH_SALARY",
          label: "13º salário",
          payroll: aggregateDocuments(
            thirteenthDocuments,
            (document) => document.grossIncomeCents ?? document.totalEarningsCents,
          ),
          statementCents: statement?.thirteenthSalaryCents ?? null,
          statementAvailable,
          blockingReason: statementIssue,
        }),
      );
    }

    if (
      thirteenthDocuments.some((document) => document.irrfCents !== null) ||
      statement?.thirteenthIrrfCents !== null
    ) {
      components.push(
        buildComponent({
          key: "THIRTEENTH_IRRF",
          label: "IRRF do 13º",
          payroll: aggregateDocuments(
            thirteenthDocuments,
            (document) => document.irrfCents,
          ),
          statementCents: statement?.thirteenthIrrfCents ?? null,
          statementAvailable,
          blockingReason: statementIssue,
        }),
      );
    }

    const annualPlr = statement
      ? statementItemTotal(
          statement.exclusiveTaxation,
          (description) =>
            /\bPLR\b/.test(description) ||
            /PARTICIPACAO.*LUCROS|LUCROS.*RESULTADOS/.test(description),
        )
      : { found: false, valueCents: null as number | null };
    if (plrDocuments.length > 0 || annualPlr.found) {
      components.push(
        buildComponent({
          key: "PLR",
          label: "PLR",
          payroll: aggregateDocuments(
            plrDocuments,
            (document) => document.grossIncomeCents ?? document.totalEarningsCents,
          ),
          statementCents: annualPlr.valueCents,
          statementAvailable,
          blockingReason: statementIssue,
        }),
      );
    }

    const annualVacation = statement
      ? statementItemTotal(
          statement.exemptIncome,
          (description) => /FERIAS|ABONO/.test(description),
        )
      : { found: false, valueCents: null as number | null };
    if (vacationDocuments.length > 0 || annualVacation.found) {
      components.push(
        buildComponent({
          key: "VACATION_ABONO",
          label: "Férias / abono",
          payroll: aggregateDocuments(
            vacationDocuments,
            (document) => document.grossIncomeCents ?? document.totalEarningsCents,
          ),
          statementCents: annualVacation.valueCents,
          statementAvailable,
          unsupportedReason:
            "A estrutura atual não separa de forma confiável férias tributáveis de abono isento; o sistema não infere essa classificação.",
        }),
      );
    }

    if (coverage) {
      components.push({
        key: "MONTHLY_COVERAGE",
        label: "Cobertura mensal",
        status: "INCOMPLETE",
        payrollCents: null,
        statementCents: null,
        differenceCents: null,
        reason: coverage,
        sources: regularDocuments.map((document) => ({
          documentId: document.id,
          month: document.month,
          paymentType: document.paymentType,
          amountCents: document.grossIncomeCents ?? document.totalEarningsCents,
          rubrics: [
            ...rubrics(document.earnings),
            ...rubrics(document.deductions),
          ],
        })),
      });
    }

    return {
      employerName: group.employerName,
      employerCnpj: group.employerCnpj,
      year,
      status: worstStatus(components.map((component) => component.status)),
      statementIds: group.statements.map((item) => item.id),
      documentCount: group.documents.length,
      components,
    };
  });

  items.sort((left, right) => {
    const employer = left.employerName.localeCompare(right.employerName);
    if (employer !== 0) return employer;
    return left.employerCnpj.localeCompare(right.employerCnpj);
  });

  const components = items.flatMap((item) => item.components);
  const matchedGroups = items.filter((item) => item.status === "MATCHED").length;
  const matchedComponents = components.filter(
    (item) => item.status === "MATCHED",
  ).length;

  return {
    year,
    status: matchedGroups === items.length ? "MATCHED" : "REVIEW_REQUIRED",
    summary: {
      groups: items.length,
      matchedGroups,
      reviewGroups: items.length - matchedGroups,
      matchedComponents,
      reviewComponents: components.length - matchedComponents,
    },
    items,
  };
}

export async function getPayrollAnnualReconciliation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(await getPayrollAnnualReconciliationForUser(userId, input.year));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Não foi possível conciliar folha e informe anual", 500);
  }
}
