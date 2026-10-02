import { createHash } from "node:crypto";

import { z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
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
  | "TAX_APURATION";

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
  const [snapshot, income, realized, taxes] = await Promise.all([
    getInvestmentFiscalYearEndSnapshotForUser(userId, year),
    getInvestmentAnnualIncomeReportForUser(userId, year),
    getInvestmentRealizedResultReportForUser(userId, year),
    getInvestmentTaxControlReportForUser(userId, year),
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

  const waitingRuleRows = taxes.rows.filter(
    (row) => row.status === "WAITING_RULES",
  );
  if (waitingRuleRows.length > 0) {
    candidates.push({
      pendingKey: `tax-rules:${year}`,
      severity: "CRITICAL",
      category: "TAX_APURATION",
      source: "TAX_CONTROL",
      entityType: "TAX_YEAR",
      entityId: String(year),
      title: `Regras fiscais de ${year} ainda não aplicadas`,
      message:
        "Há competências com resultado/IRRF/DARF registrados, mas o imposto devido e o saldo em aberto ainda aguardam o catálogo fiscal versionado.",
      suggestedAction:
        "Concluir a regra fiscal versionada do ano antes de considerar a apuração completa.",
      fingerprintContext: {
        year,
        ruleDependency: taxes.ruleDependency,
        rows: waitingRuleRows.map((row) => ({
          month: row.month,
          assetType: row.assetType,
          currency: row.currency,
          taxableResultAfterCompensationCents:
            row.taxableResultAfterCompensationCents,
          withholdingCents: row.withholdingCents,
          paidDarfCents: row.paidDarfCents,
        })),
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
