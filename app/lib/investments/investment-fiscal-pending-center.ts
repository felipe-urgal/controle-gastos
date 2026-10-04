import { createHash } from "node:crypto";

import { z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getAnnualFinancialStatementReconciliationForUser } from "@/app/lib/investments/annual-financial-statement-reconciliation";
import { getPayrollAnnualReconciliationForUser } from "@/app/lib/payroll/payroll-annual-reconciliation";
import { getInvestmentAnnualIncomeReportForUser } from "@/app/lib/investments/investment-annual-income-report";
import { getInvestmentFiscalYearEndSnapshotForUser } from "@/app/lib/investments/investment-fiscal-snapshot";
import { getInvestmentRealizedResultReportForUser } from "@/app/lib/investments/investment-realized-result-report";
import { getInvestmentTaxControlReportForUser } from "@/app/lib/investments/investment-tax-control";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const justifySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  justification: z.string().trim().min(5).max(1000),
});

type Severity = "CRITICAL" | "WARNING";
type Category =
  | "FISCAL_COST"
  | "YEAR_END_SNAPSHOT"
  | "INCOME_CLASSIFICATION"
  | "REALIZED_RESULT"
  | "TAX_APURATION"
  | "PAYROLL_RECONCILIATION"
  | "ANNUAL_STATEMENT_RECONCILIATION";

type PendingCandidate = {
  pendingKey: string;
  severity: Severity;
  category: Category;
  source: string;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  suggestedAction: string;
  fingerprintContext: Record<string, unknown>;
};

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function finalize(candidate: PendingCandidate) {
  return {
    ...candidate,
    fingerprint: hash({
      pendingKey: candidate.pendingKey,
      severity: candidate.severity,
      category: candidate.category,
      source: candidate.source,
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      message: candidate.message,
      fingerprintContext: candidate.fingerprintContext,
    }),
  };
}

function fiscalCostAction(code: string) {
  switch (code) {
    case "FISCAL_QUANTITY_MISMATCH":
      return "Revise transferências de custódia e informe o custo fiscal herdado quando necessário.";
    case "MISSING_OPERATION_VALUE":
      return "Complete o valor da operação ou registre um baseline fiscal auditável.";
    case "INSUFFICIENT_FISCAL_POSITION":
      return "Revise o histórico anterior e informe um baseline fiscal conhecido.";
    case "UNSUPPORTED_FISCAL_EVENT":
      return "Revise e classifique o evento fiscal antes de concluir o ano.";
    default:
      return "Revise o histórico fiscal do ativo.";
  }
}

async function generatePendingCandidates(userId: string, year: number) {
  const [snapshot, income, realized, taxes, payroll, annualStatements] =
    await Promise.all([
      getInvestmentFiscalYearEndSnapshotForUser(userId, year),
      getInvestmentAnnualIncomeReportForUser(userId, year),
      getInvestmentRealizedResultReportForUser(userId, year),
      getInvestmentTaxControlReportForUser(userId, year),
      getPayrollAnnualReconciliationForUser(userId, year),
      getAnnualFinancialStatementReconciliationForUser(userId, year),
    ]);

  const candidates: PendingCandidate[] = [];

  for (const item of snapshot.current.items) {
    for (const pending of item.pending) {
      candidates.push({
        pendingKey: [
          "snapshot",
          item.assetId,
          pending.code,
          pending.eventId ?? "asset",
        ].join(":"),
        severity: "CRITICAL",
        category:
          pending.code === "FISCAL_QUANTITY_MISMATCH"
            ? "FISCAL_COST"
            : "YEAR_END_SNAPSHOT",
        source: "FISCAL_SNAPSHOT",
        entityType: "INVESTMENT_ASSET",
        entityId: item.assetId,
        title: `${item.symbol} · fechamento fiscal pendente`,
        message: pending.message,
        suggestedAction: fiscalCostAction(pending.code),
        fingerprintContext: {
          year,
          quantity: item.quantity,
          economicQuantity: item.economicQuantity,
          costBasisCents: item.costBasisCents,
          code: pending.code,
        },
      });
    }
  }

  for (const pending of income.pending) {
    candidates.push({
      pendingKey: [
        "income",
        pending.assetId,
        pending.incomeType,
        pending.institutionId,
        pending.code,
      ].join(":"),
      severity: "CRITICAL",
      category: "INCOME_CLASSIFICATION",
      source: "ANNUAL_INCOME_REPORT",
      entityType: "INVESTMENT_ASSET",
      entityId: pending.assetId,
      title: `${pending.symbol} · rendimento sem classificação fiscal suficiente`,
      message: pending.message,
      suggestedAction:
        "Revise a classificação do rendimento antes de usar o relatório anual como completo.",
      fingerprintContext: {
        year,
        incomeType: pending.incomeType,
        institutionId: pending.institutionId,
        institutionName: pending.institutionName,
      },
    });
  }

  for (const pending of realized.pending) {
    candidates.push({
      pendingKey: [
        "realized",
        pending.eventId,
        hash(pending.message).slice(0, 12),
      ].join(":"),
      severity: "CRITICAL",
      category: "REALIZED_RESULT",
      source: "REALIZED_RESULT_REPORT",
      entityType: "INVESTMENT_OPERATION",
      entityId: pending.eventId,
      title: `${pending.symbol} · venda sem apuração confiável`,
      message: pending.message,
      suggestedAction:
        "Corrija o custo fiscal ou o histórico da venda e recalcule a apuração.",
      fingerprintContext: {
        year,
        month: pending.month,
        assetType: pending.assetType,
        currency: pending.currency,
      },
    });
  }

  if (!taxes.ruleSupported) {
    candidates.push({
      pendingKey: `tax-rules:${year}`,
      severity: "CRITICAL",
      category: "TAX_APURATION",
      source: "TAX_CONTROL",
      entityType: "TAX_YEAR",
      entityId: String(year),
      title: `Regras fiscais de ${year} ainda não suportadas`,
      message:
        `O exercício ${taxes.taxExercise} ainda não possui catálogo fiscal suportado. Nenhuma regra de outro ano foi reutilizada automaticamente.`,
      suggestedAction:
        "Aguarde a publicação oficial aplicável e adicione uma nova versão do catálogo antes de concluir a apuração.",
      fingerprintContext: {
        year,
        taxExercise: taxes.taxExercise,
        unsupportedClasses: taxes.unsupportedClasses,
        unsupportedCurrencies: taxes.unsupportedCurrencies,
        unsupportedTaxLocations: taxes.unsupportedTaxLocations,
      },
    });
  } else {
    if (taxes.unsupportedClasses.length > 0) {
      candidates.push({
        pendingKey: `tax-classes:${year}`,
        severity: "CRITICAL",
        category: "TAX_APURATION",
        source: "TAX_CONTROL",
        entityType: "TAX_YEAR",
        entityId: String(year),
        title: `Classes fiscais sem regra em ${year}`,
        message: `Há movimentações em classes ainda não suportadas pelo catálogo: ${taxes.unsupportedClasses.join(", ")}.`,
        suggestedAction:
          "Revise a classificação dos ativos ou amplie o catálogo somente com fonte oficial.",
        fingerprintContext: {
          year,
          unsupportedClasses: taxes.unsupportedClasses,
        },
      });
    }

    if (taxes.unsupportedCurrencies.length > 0) {
      candidates.push({
        pendingKey: `tax-currencies:${year}`,
        severity: "CRITICAL",
        category: "TAX_APURATION",
        source: "TAX_CONTROL",
        entityType: "TAX_YEAR",
        entityId: String(year),
        title: `Moedas estrangeiras fora do motor fiscal brasileiro em ${year}`,
        message:
          `Há movimentações em ${taxes.unsupportedCurrencies.join(", ")}. O motor atual de bolsa/DARF 6015 suporta somente BRL e não calcula investimentos no exterior.`,
        suggestedAction:
          "Mantenha esses ativos pendentes até existir tratamento fiscal específico para aplicações financeiras no exterior.",
        fingerprintContext: {
          year,
          unsupportedCurrencies: taxes.unsupportedCurrencies,
        },
      });
    }

    if (taxes.unsupportedTaxLocations.length > 0) {
      candidates.push({
        pendingKey: `tax-locations:${year}`,
        severity: "CRITICAL",
        category: "TAX_APURATION",
        source: "TAX_CONTROL",
        entityType: "TAX_YEAR",
        entityId: String(year),
        title: `Investimentos no exterior fora da apuração local em ${year}`,
        message:
          "Há ativos classificados como exterior. Eles não recebem regras de bolsa brasileira nem DARF 6015 e permanecem pendentes até a apuração anual específica da Lei 14.754/2023.",
        suggestedAction:
          "Mantenha a localização fiscal correta e conclua a apuração anual de aplicações no exterior antes de fechar o ano.",
        fingerprintContext: {
          year,
          unsupportedTaxLocations: taxes.unsupportedTaxLocations,
        },
      });
    }

    for (const row of taxes.rows) {
      if (row.status === "PENDING_APURACAO") continue;
      if ((row.openTaxBalanceCents ?? 0) <= 0) continue;

      candidates.push({
        pendingKey: [
          "tax-open",
          row.year,
          row.month,
          row.taxGroup,
          row.currency,
        ].join(":"),
        severity: "CRITICAL",
        category: "TAX_APURATION",
        source: "TAX_CONTROL",
        entityType: "TAX_COMPETENCE",
        entityId: `${row.year}-${String(row.month).padStart(2, "0")}:${row.taxGroup}:${row.currency}`,
        title: `Imposto em aberto · ${String(row.month).padStart(2, "0")}/${row.year} · ${row.taxGroup}`,
        message:
          row.status === "BELOW_MINIMUM"
            ? "Existe imposto apurado abaixo do valor mínimo de recolhimento, carregado para competências seguintes."
            : "Existe saldo de imposto apurado ainda não coberto pelos DARFs registrados.",
        suggestedAction:
          "Confira os DARFs pagos e mantenha o saldo acompanhado até a quitação.",
        fingerprintContext: {
          year: row.year,
          month: row.month,
          taxGroup: row.taxGroup,
          currency: row.currency,
          taxDueCents: row.taxDueCents,
          paidDarfCents: row.paidDarfCents,
          openTaxBalanceCents: row.openTaxBalanceCents,
        },
      });
    }
  }

  for (const group of payroll.items) {
    for (const component of group.components) {
      if (component.status === "MATCHED") continue;

      const mismatchMessage =
        component.status === "MISMATCH"
          ? `Holerites: ${component.payrollCents ?? "não informado"} centavos; informe: ${component.statementCents ?? "não informado"} centavos; diferença: ${component.differenceCents ?? "não calculada"} centavos.`
          : component.reason ?? "Conciliação anual pendente.";

      candidates.push({
        pendingKey: [
          "payroll",
          year,
          group.employerCnpj.replace(/\D/g, ""),
          component.key,
        ].join(":"),
        severity:
          component.status === "UNSUPPORTED_COMPONENT"
            ? "WARNING"
            : "CRITICAL",
        category: "PAYROLL_RECONCILIATION",
        source: "PAYROLL_ANNUAL_RECONCILIATION",
        entityType: "EMPLOYER_YEAR",
        entityId: `${group.employerCnpj}:${year}`,
        title: `${group.employerName} · ${component.label}`,
        message: mismatchMessage,
        suggestedAction:
          component.status === "MISMATCH"
            ? "Revise as competências e rubricas que compõem o total antes de concluir o ano."
            : "Complete ou classifique os documentos faltantes e recalcule a conciliação.",
        fingerprintContext: {
          year,
          employerCnpj: group.employerCnpj,
          component: component.key,
          status: component.status,
          payrollCents: component.payrollCents,
          statementCents: component.statementCents,
          differenceCents: component.differenceCents,
        },
      });
    }
  }

  for (const item of annualStatements.positions) {
    if (item.status === "MATCHED") continue;

    candidates.push({
      pendingKey: [
        "annual-statement-position",
        year,
        item.statementId ?? "internal",
        item.positionIndex ?? item.internalAssetId ?? item.symbol ?? "unlinked",
      ].join(":"),
      severity: item.status === "REVIEW_REQUIRED" ? "WARNING" : "CRITICAL",
      category: "ANNUAL_STATEMENT_RECONCILIATION",
      source: "ANNUAL_FINANCIAL_STATEMENT_RECONCILIATION",
      entityType: item.internalAssetId ? "INVESTMENT_ASSET" : "ANNUAL_STATEMENT_POSITION",
      entityId:
        item.internalAssetId ??
        [item.statementId ?? "internal", item.positionIndex ?? "missing"].join(":"),
      title: (item.symbol ?? item.description) + " · posição anual divergente",
      message:
        item.reason ??
        "A posição do informe anual exige revisão antes de concluir o ano fiscal.",
      suggestedAction:
        item.status === "MISMATCH" && item.canApplyBaseline
          ? "Revise a quantidade e, se o custo explicitamente informado estiver correto, confirme o baseline fiscal pelo informe."
          : "Revise o histórico do ativo e os dados do informe anual; nenhuma operação será criada automaticamente.",
      fingerprintContext: {
        year,
        statementId: item.statementId,
        positionIndex: item.positionIndex,
        symbol: item.symbol,
        status: item.status,
        statementQuantity: item.statementQuantity,
        internalQuantity: item.internalQuantity,
        statementCostCents: item.statementCostCents,
        internalCostCents: item.internalCostCents,
      },
    });
  }

  for (const item of annualStatements.incomes) {
    if (item.status === "MATCHED") continue;

    candidates.push({
      pendingKey: [
        "annual-statement-income",
        year,
        item.symbol ?? hash(item.descriptions).slice(0, 12),
      ].join(":"),
      severity: item.status === "REVIEW_REQUIRED" ? "WARNING" : "CRITICAL",
      category: "ANNUAL_STATEMENT_RECONCILIATION",
      source: "ANNUAL_FINANCIAL_STATEMENT_RECONCILIATION",
      entityType: item.internalAssetId ? "INVESTMENT_ASSET" : "ANNUAL_STATEMENT_INCOME",
      entityId: item.internalAssetId ?? item.symbol ?? hash(item.descriptions).slice(0, 12),
      title: (item.symbol ?? item.descriptions[0] ?? "Rendimento") + " · rendimento anual divergente",
      message:
        item.reason ??
        "O rendimento do informe anual exige revisão antes de concluir o ano fiscal.",
      suggestedAction:
        "Compare os pagamentos internos com o informe e corrija a fonte de dados; a divergência não é ajustada automaticamente.",
      fingerprintContext: {
        year,
        symbol: item.symbol,
        status: item.status,
        statementAmountCents: item.statementAmountCents,
        internalAmountCents: item.internalAmountCents,
        differenceCents: item.differenceCents,
      },
    });
  }

  return candidates.map(finalize).sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "CRITICAL" ? -1 : 1;
    }
    const category = left.category.localeCompare(right.category);
    if (category !== 0) return category;
    return left.title.localeCompare(right.title);
  });
}

export async function getFiscalPendingCenterForUser(
  userId: string,
  year: number,
) {
  const [generated, resolutions] = await Promise.all([
    generatePendingCandidates(userId, year),
    prisma.investmentFiscalPendingResolution.findMany({
      where: { userId, year },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);

  const resolutionByFingerprint = new Map(
    resolutions.map((resolution) => [resolution.fingerprint, resolution]),
  );

  const items = generated.map((item) => {
    const resolution = resolutionByFingerprint.get(item.fingerprint) ?? null;
    return {
      ...item,
      status: resolution ? ("JUSTIFIED" as const) : ("ACTIVE" as const),
      resolution: resolution
        ? {
            id: resolution.id,
            justification: resolution.justification,
            createdAt: resolution.createdAt,
            updatedAt: resolution.updatedAt,
          }
        : null,
    };
  });

  const active = items.filter((item) => item.status === "ACTIVE");
  const justified = items.filter((item) => item.status === "JUSTIFIED");

  return {
    year,
    status:
      active.length > 0
        ? ("INCOMPLETE" as const)
        : justified.length > 0
          ? ("COMPLETE_WITH_JUSTIFICATIONS" as const)
          : ("COMPLETE" as const),
    summary: {
      total: items.length,
      active: active.length,
      critical: active.filter((item) => item.severity === "CRITICAL").length,
      warning: active.filter((item) => item.severity === "WARNING").length,
      justified: justified.length,
    },
    items,
    resolutionHistory: resolutions.map((resolution) => ({
      id: resolution.id,
      pendingKey: resolution.pendingKey,
      fingerprint: resolution.fingerprint,
      justification: resolution.justification,
      applied: generated.some(
        (candidate) => candidate.fingerprint === resolution.fingerprint,
      ),
      createdAt: resolution.createdAt,
      updatedAt: resolution.updatedAt,
    })),
  };
}

export async function getFiscalPendingCenter(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(await getFiscalPendingCenterForUser(userId, input.year));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao carregar pendências fiscais", 500);
  }
}

export async function justifyFiscalPending(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = justifySchema.parse(await parseJsonBody(request));
    const current = await generatePendingCandidates(userId, input.year);
    const pending = current.find(
      (item) => item.fingerprint === input.fingerprint,
    );

    if (!pending) {
      return failure(
        "A pendência mudou ou já foi corrigida. Recarregue a central antes de justificar.",
        409,
      );
    }

    const existing = await prisma.investmentFiscalPendingResolution.findUnique({
      where: {
        userId_year_fingerprint: {
          userId,
          year: input.year,
          fingerprint: input.fingerprint,
        },
      },
    });
    if (existing) {
      return failure("Esta versão da pendência já possui justificativa.", 409);
    }

    const resolution =
      await prisma.investmentFiscalPendingResolution.create({
        data: {
          userId,
          year: input.year,
          pendingKey: pending.pendingKey,
          fingerprint: pending.fingerprint,
          justification: input.justification,
        },
      });

    return success(
      {
        id: resolution.id,
        pendingKey: resolution.pendingKey,
        fingerprint: resolution.fingerprint,
        justification: resolution.justification,
        createdAt: resolution.createdAt,
      },
      "Pendência justificada de forma auditável",
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao justificar pendência fiscal", 500);
  }
}
