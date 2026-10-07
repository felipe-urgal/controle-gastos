import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  payrollCompensationValues,
  reconcilePayrollCompetence,
} from "@/app/lib/payroll/payroll-reconciliation";
import { prisma } from "@/app/lib/prisma";

const resolveSchema = z.object({
  advanceDocumentId: z.string().uuid(),
  regularDocumentId: z.string().uuid(),
  rubricIndex: z.number().int().nonnegative(),
  confirmed: z.literal(true),
});

type ResolveInput = z.infer<typeof resolveSchema>;

class PayrollAdvanceResolutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isManualEvidence(value: Prisma.JsonValue) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).source === "MANUAL"
  );
}

function evidenceRubricIndex(value: Prisma.JsonValue) {
  if (!isManualEvidence(value)) return null;
  const selected = (value as Record<string, unknown>).selectedRubric;
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) {
    return null;
  }
  const index = (selected as Record<string, unknown>).rubricIndex;
  return typeof index === "number" ? index : null;
}

function competenceKey(value: {
  employerCnpj: string;
  year: number;
  month: number;
}) {
  return [value.employerCnpj, value.year, value.month].join("|");
}

export async function getPayrollAdvanceResolutionForUser(userId: string) {
  const links = await prisma.payrollAdvanceLink.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "MATCHED"] },
    },
    select: {
      id: true,
      status: true,
      compensationCents: true,
      reason: true,
      evidence: true,
      updatedAt: true,
      regularDocumentId: true,
      advanceDocument: {
        select: {
          id: true,
          lifecycleStatus: true,
          paymentType: true,
          employerName: true,
          employerCnpj: true,
          year: true,
          month: true,
          grossIncomeCents: true,
          totalEarningsCents: true,
          netPaidCents: true,
        },
      },
      regularDocument: {
        select: {
          id: true,
          lifecycleStatus: true,
          paymentType: true,
          createdAt: true,
        },
      },
    },
  });

  const visible = links.filter(
    (link) =>
      link.advanceDocument.lifecycleStatus === "ACTIVE" &&
      link.advanceDocument.paymentType === "ADVANCE" &&
      (link.status === "PENDING" || isManualEvidence(link.evidence)),
  );

  const pendingKeys = new Map<
    string,
    { employerCnpj: string; year: number; month: number }
  >();
  for (const link of visible) {
    if (link.status !== "PENDING") continue;
    const value = link.advanceDocument;
    pendingKeys.set(competenceKey(value), {
      employerCnpj: value.employerCnpj,
      year: value.year,
      month: value.month,
    });
  }

  const regularDocuments =
    pendingKeys.size === 0
      ? []
      : await prisma.payrollDocument.findMany({
          where: {
            userId,
            lifecycleStatus: "ACTIVE",
            paymentType: "REGULAR",
            OR: [...pendingKeys.values()],
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            employerName: true,
            employerCnpj: true,
            year: true,
            month: true,
            createdAt: true,
            netPaidCents: true,
            deductions: true,
          },
        });

  const regularsByCompetence = new Map<
    string,
    typeof regularDocuments
  >();
  for (const regular of regularDocuments) {
    const key = competenceKey(regular);
    const current = regularsByCompetence.get(key) ?? [];
    current.push(regular);
    regularsByCompetence.set(key, current);
  }

  const items = visible.map((link) => {
    const advance = link.advanceDocument;
    const expectedAdvanceCents =
      advance.totalEarningsCents ?? advance.grossIncomeCents;
    const candidates =
      link.status === "PENDING"
        ? (regularsByCompetence.get(competenceKey(advance)) ?? []).flatMap(
            (regular) =>
              payrollCompensationValues(regular.deductions).map((rubric) => ({
                regularDocumentId: regular.id,
                rubricIndex: rubric.rubricIndex,
                description: rubric.description,
                compensationCents: rubric.amount,
                differenceCents:
                  expectedAdvanceCents === null
                    ? null
                    : rubric.amount - expectedAdvanceCents,
                exactAmount:
                  expectedAdvanceCents !== null &&
                  rubric.amount === expectedAdvanceCents,
                importedAt: regular.createdAt.toISOString(),
              })),
          )
        : [];

    return {
      linkId: link.id,
      advanceDocumentId: advance.id,
      employerName: advance.employerName,
      employerCnpj: advance.employerCnpj,
      year: advance.year,
      month: advance.month,
      expectedAdvanceCents,
      netPaidCents: advance.netPaidCents,
      status: link.status,
      reason: link.reason,
      decisionSource: isManualEvidence(link.evidence) ? "MANUAL" : "AUTOMATIC",
      selectedRegularDocumentId: link.regularDocumentId,
      selectedRubricIndex: evidenceRubricIndex(link.evidence),
      compensationCents: link.compensationCents,
      resolvedAt: isManualEvidence(link.evidence)
        ? link.updatedAt.toISOString()
        : null,
      candidates,
    };
  });

  items.sort((left, right) => {
    if (left.year !== right.year) return right.year - left.year;
    if (left.month !== right.month) return right.month - left.month;
    return left.employerName.localeCompare(right.employerName);
  });

  return items;
}

export async function resolvePayrollAdvanceForUser(
  userId: string,
  input: Omit<ResolveInput, "confirmed">,
) {
  return prisma.$transaction(
    async (tx) => {
      const advance = await tx.payrollDocument.findFirst({
        where: {
          id: input.advanceDocumentId,
          userId,
          lifecycleStatus: "ACTIVE",
          paymentType: "ADVANCE",
        },
        select: {
          id: true,
          employerCnpj: true,
          year: true,
          month: true,
          grossIncomeCents: true,
          totalEarningsCents: true,
        },
      });
      if (!advance) {
        throw new PayrollAdvanceResolutionError(
          "Adiantamento ativo não encontrado",
          404,
        );
      }

      const regular = await tx.payrollDocument.findFirst({
        where: {
          id: input.regularDocumentId,
          userId,
          lifecycleStatus: "ACTIVE",
          paymentType: "REGULAR",
          employerCnpj: advance.employerCnpj,
          year: advance.year,
          month: advance.month,
        },
        select: {
          id: true,
          deductions: true,
        },
      });
      if (!regular) {
        throw new PayrollAdvanceResolutionError(
          "Folha regular compatível não encontrada",
          409,
        );
      }

      const candidate = payrollCompensationValues(regular.deductions).find(
        (item) => item.rubricIndex === input.rubricIndex,
      );
      if (!candidate) {
        throw new PayrollAdvanceResolutionError(
          "Rubrica de compensação não está mais disponível",
          409,
        );
      }

      const previous = await tx.payrollAdvanceLink.findUnique({
        where: { advanceDocumentId: advance.id },
        select: {
          status: true,
          reason: true,
          regularDocumentId: true,
          compensationCents: true,
          evidence: true,
        },
      });
      const expectedAdvanceCents =
        advance.totalEarningsCents ?? advance.grossIncomeCents;

      if (
        previous?.status === "MATCHED" &&
        previous.regularDocumentId === regular.id &&
        previous.compensationCents === candidate.amount &&
        evidenceRubricIndex(previous.evidence) === candidate.rubricIndex &&
        isManualEvidence(previous.evidence)
      ) {
        return {
          advanceDocumentId: advance.id,
          regularDocumentId: regular.id,
          compensationCents: candidate.amount,
          created: false,
        };
      }

      const link = await tx.payrollAdvanceLink.upsert({
        where: { advanceDocumentId: advance.id },
        create: {
          userId,
          advanceDocumentId: advance.id,
          regularDocumentId: regular.id,
          status: "MATCHED",
          compensationCents: candidate.amount,
          reason: null,
          evidence: {
            source: "MANUAL",
            resolvedAt: new Date().toISOString(),
            employerCnpj: advance.employerCnpj,
            year: advance.year,
            month: advance.month,
            expectedAdvanceCents,
            selectedRubric: {
              regularDocumentId: regular.id,
              rubricIndex: candidate.rubricIndex,
              description: candidate.description,
              compensationCents: candidate.amount,
            },
            differenceCents:
              expectedAdvanceCents === null
                ? null
                : candidate.amount - expectedAdvanceCents,
            previousAutomaticStatus: previous?.status ?? null,
            previousAutomaticReason: previous?.reason ?? null,
          },
        },
        update: {
          regularDocumentId: regular.id,
          status: "MATCHED",
          compensationCents: candidate.amount,
          reason: null,
          evidence: {
            source: "MANUAL",
            resolvedAt: new Date().toISOString(),
            employerCnpj: advance.employerCnpj,
            year: advance.year,
            month: advance.month,
            expectedAdvanceCents,
            selectedRubric: {
              regularDocumentId: regular.id,
              rubricIndex: candidate.rubricIndex,
              description: candidate.description,
              compensationCents: candidate.amount,
            },
            differenceCents:
              expectedAdvanceCents === null
                ? null
                : candidate.amount - expectedAdvanceCents,
            previousAutomaticStatus: previous?.status ?? null,
            previousAutomaticReason: previous?.reason ?? null,
          },
        },
        select: {
          regularDocumentId: true,
          compensationCents: true,
        },
      });

      return {
        advanceDocumentId: advance.id,
        regularDocumentId: link.regularDocumentId,
        compensationCents: link.compensationCents,
        created: true,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function undoPayrollAdvanceResolutionForUser(
  userId: string,
  advanceDocumentId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const link = await tx.payrollAdvanceLink.findFirst({
        where: {
          userId,
          advanceDocumentId,
          advanceDocument: {
            userId,
            lifecycleStatus: "ACTIVE",
            paymentType: "ADVANCE",
          },
        },
        select: {
          id: true,
          evidence: true,
          advanceDocument: {
            select: {
              employerCnpj: true,
              year: true,
              month: true,
            },
          },
        },
      });

      if (!link) {
        return { removed: false, status: null as "PENDING" | "MATCHED" | null };
      }
      if (!isManualEvidence(link.evidence)) {
        throw new PayrollAdvanceResolutionError(
          "Somente uma decisão manual pode ser desfeita por este fluxo",
          409,
        );
      }

      await tx.payrollAdvanceLink.delete({ where: { id: link.id } });
      await reconcilePayrollCompetence(
        {
          userId,
          employerCnpj: link.advanceDocument.employerCnpj,
          year: link.advanceDocument.year,
          month: link.advanceDocument.month,
        },
        tx,
      );

      const current = await tx.payrollAdvanceLink.findUnique({
        where: { advanceDocumentId },
        select: { status: true },
      });

      return {
        removed: true,
        status: current?.status ?? null,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getPayrollAdvanceResolution() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getPayrollAdvanceResolutionForUser(userId));
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível carregar os adiantamentos pendentes", 500);
  }
}

export async function resolvePayrollAdvance(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = resolveSchema.parse(await parseJsonBody(request));
    const result = await resolvePayrollAdvanceForUser(userId, input);
    return success(
      result,
      result.created ? "Adiantamento vinculado manualmente" : "Vínculo manual já confirmado",
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (error instanceof PayrollAdvanceResolutionError) {
      return failure(error.message, error.status);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return failure(
        "O estado da conciliação mudou; atualize e confirme novamente",
        409,
      );
    }
    return failure("Não foi possível resolver o adiantamento", 500);
  }
}

export async function undoPayrollAdvanceResolution(
  _request: Request,
  context?: { params: Promise<{ documentId: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Adiantamento não encontrado", 404);
    const { documentId } = await context.params;
    const result = await undoPayrollAdvanceResolutionForUser(userId, documentId);
    return success(
      result,
      result.removed ? "Decisão manual desfeita" : "Nenhuma decisão manual ativa",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (error instanceof PayrollAdvanceResolutionError) {
      return failure(error.message, error.status);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return failure(
        "O estado da conciliação mudou; atualize e tente novamente",
        409,
      );
    }
    return failure("Não foi possível desfazer a decisão manual", 500);
  }
}
