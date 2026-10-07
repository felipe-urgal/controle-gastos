import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  annualEmploymentIncomeFingerprint,
  annualEmploymentIncomeIdentity,
  parseAnnualEmploymentIncomeStatement,
} from "@/app/lib/payroll/annual-income-statement-parser";
import {
  signAnnualStatementPreview,
  verifyAnnualStatementPreview,
} from "@/app/lib/payroll/annual-income-preview-token";
import { prisma } from "@/app/lib/prisma";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  extractPdfText,
  PdfExperimentError,
  PDF_EXPERIMENT_MAX_BYTES,
} from "@/app/lib/transactions/import/pdf-experiment";

const itemSchema = z.object({
  description: z.string().min(1).max(500),
  amountCents: z.number().int().nonnegative().nullable(),
});

const statementSchema = z.object({
  calendarYear: z.number().int().min(0).max(2100),
  taxExercise: z.number().int().min(0).max(2100),
  payerName: z.string().min(1).max(180),
  payerTaxId: z.string().max(18),
  beneficiaryName: z.string().max(180).nullable(),
  beneficiaryTaxId: z.string().max(18).nullable(),
  incomeNature: z.string().max(240).nullable(),
  taxableIncomeCents: z.number().int().nonnegative().nullable(),
  officialPensionCents: z.number().int().nonnegative().nullable(),
  complementaryPensionCents: z.number().int().nonnegative().nullable(),
  alimonyCents: z.number().int().nonnegative().nullable(),
  irrfCents: z.number().int().nonnegative().nullable(),
  thirteenthSalaryCents: z.number().int().nonnegative().nullable(),
  thirteenthIrrfCents: z.number().int().nonnegative().nullable(),
  exemptIncome: z.array(itemSchema),
  exclusiveTaxation: z.array(itemSchema),
  accumulatedIncome: z.array(itemSchema),
  notes: z.array(z.string().max(1000)),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  fingerprint: z.string().length(64),
  duplicate: z.boolean(),
});

const confirmSchema = z.object({
  previewToken: z.string().min(1),
  selected: z.boolean(),
  statement: statementSchema,
  supersedesId: z.string().uuid().nullable().optional(),
});

function unauthorized(error: unknown) {
  return isUnauthorizedError(error) ? failure("Não autorizado", 401) : null;
}

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function previewAnnualEmploymentIncomeStatement(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeImportRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas operações de importação em pouco tempo. Tente novamente mais tarde",
        limit.retryAfterSeconds,
        "IMPORT_RATE_LIMITED",
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return failure("Selecione um informe anual em PDF", 400);
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > PDF_EXPERIMENT_MAX_BYTES) return failure("PDF excede o limite de 2 MB", 413);
    if (file.name.toLowerCase().split(".").pop() !== "pdf") {
      return failure("Formato não suportado. Envie um arquivo PDF", 400);
    }

    let extracted: ReturnType<typeof extractPdfText>;
    try {
      extracted = extractPdfText(new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof PdfExperimentError && /sem texto extraível/i.test(error.message)) {
        return success({
          fileName: file.name,
          requiresOcr: true,
          previewToken: null,
          statement: null,
          warnings: [
            "PDF sem texto extraível. OCR/revisão manual é necessário; nenhum dado foi inferido ou persistido.",
          ],
        });
      }
      throw error;
    }

    let parsed;
    try {
      parsed = parseAnnualEmploymentIncomeStatement(extracted.text);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ANNUAL_INCOME_STATEMENT_NOT_RECOGNIZED"
      ) {
        return failure("PDF não reconhecido como informe anual de rendimentos do trabalho", 400);
      }
      throw error;
    }

    const fingerprint = annualEmploymentIncomeFingerprint(userId, parsed);
    const identity = annualEmploymentIncomeIdentity(parsed);
    const [existing, replacementCandidates] = await Promise.all([
      prisma.annualEmploymentIncomeStatement.findUnique({
        where: {
          userId_importFingerprint: {
            userId,
            importFingerprint: fingerprint,
          },
        },
        select: { id: true },
      }),
      prisma.annualEmploymentIncomeStatement.findMany({
        where: {
          userId,
          lifecycleStatus: "ACTIVE",
          payerTaxId: identity.payerTaxId,
          calendarYear: identity.calendarYear,
          taxExercise: identity.taxExercise,
          importFingerprint: { not: fingerprint },
          OR: [
            { beneficiaryTaxId: identity.beneficiary },
            ...(identity.beneficiary
              ? [{ beneficiaryName: identity.beneficiary }]
              : []),
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          createdAt: true,
          taxableIncomeCents: true,
        },
      }),
    ]);
    const statement = {
      ...parsed,
      fingerprint,
      duplicate: Boolean(existing),
    };

    return success({
      fileName: file.name,
      pageCount: extracted.pageCount,
      requiresOcr: false,
      previewToken: signAnnualStatementPreview(userId, statement),
      statement,
      replacementCandidates,
      warnings: [
        ...extracted.warnings,
        ...parsed.warnings,
        ...(replacementCandidates.length > 1
          ? ["Há mais de uma versão ativa deste informe; escolha explicitamente qual versão será substituída."]
          : []),
      ],
    });
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof PdfExperimentError) return failure(error.message, 400);
    return failure("Não foi possível analisar o informe anual", 500);
  }
}

export async function confirmAnnualEmploymentIncomeStatement(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeImportRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas operações de importação em pouco tempo. Tente novamente mais tarde",
        limit.retryAfterSeconds,
        "IMPORT_RATE_LIMITED",
      );
    }

    const input = confirmSchema.parse(await request.json());
    if (!input.selected) return failure("Selecione o informe para importar", 400);

    verifyAnnualStatementPreview(input.previewToken, userId, input.statement);

    if (input.statement.errors.length > 0) {
      return failure("O informe possui pendências que impedem a importação", 400);
    }
    if (
      !input.statement.payerTaxId ||
      input.statement.calendarYear < 2000 ||
      input.statement.taxExercise < 2000
    ) {
      return failure("Informe incompleto para persistência", 400);
    }

    const existing = await prisma.annualEmploymentIncomeStatement.findUnique({
      where: {
        userId_importFingerprint: {
          userId,
          importFingerprint: input.statement.fingerprint,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return success({ created: false, duplicate: true, id: existing.id }, "Informe já importado");
    }

    const identity = annualEmploymentIncomeIdentity(input.statement);
    const supersedesId = input.supersedesId ?? null;
    const created = await prisma.$transaction(async (tx) => {
      if (supersedesId) {
        const target = await tx.annualEmploymentIncomeStatement.findFirst({
          where: {
            id: supersedesId,
            userId,
            lifecycleStatus: "ACTIVE",
            payerTaxId: identity.payerTaxId,
            calendarYear: identity.calendarYear,
            taxExercise: identity.taxExercise,
            OR: [
              { beneficiaryTaxId: identity.beneficiary },
              ...(identity.beneficiary
                ? [{ beneficiaryName: identity.beneficiary }]
                : []),
            ],
          },
          select: { id: true },
        });
        if (!target) throw new Error("INVALID_SUPERSEDES_TARGET");

        await tx.annualEmploymentIncomeStatement.update({
          where: { id: target.id },
          data: {
            lifecycleStatus: "SUPERSEDED",
            supersededAt: new Date(),
          },
        });
      }

      return tx.annualEmploymentIncomeStatement.create({
        data: {
          userId,
          calendarYear: input.statement.calendarYear,
          taxExercise: input.statement.taxExercise,
          payerName: input.statement.payerName,
          payerTaxId: input.statement.payerTaxId,
          beneficiaryName: input.statement.beneficiaryName,
          beneficiaryTaxId: input.statement.beneficiaryTaxId,
          incomeNature: input.statement.incomeNature,
          taxableIncomeCents: input.statement.taxableIncomeCents,
          officialPensionCents: input.statement.officialPensionCents,
          complementaryPensionCents: input.statement.complementaryPensionCents,
          alimonyCents: input.statement.alimonyCents,
          irrfCents: input.statement.irrfCents,
          thirteenthSalaryCents: input.statement.thirteenthSalaryCents,
          thirteenthIrrfCents: input.statement.thirteenthIrrfCents,
          exemptIncome: json(input.statement.exemptIncome),
          exclusiveTaxation: json(input.statement.exclusiveTaxation),
          accumulatedIncome: json(input.statement.accumulatedIncome),
          notes: json(input.statement.notes),
          warnings: json(input.statement.warnings),
          importFingerprint: input.statement.fingerprint,
          supersedesId,
        },
        select: { id: true },
      });
    });

    return success(
      { created: true, duplicate: false, id: created.id },
      "Informe anual importado",
      201,
    );
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (error instanceof Error && error.message === "INVALID_PREVIEW_TOKEN") {
      return failure("Preview expirado ou inválido. Gere um novo preview", 400);
    }
    if (error instanceof Error && error.message === "INVALID_SUPERSEDES_TARGET") {
      return failure("A versão escolhida para substituição não está mais ativa ou não pertence ao mesmo informe", 409);
    }
    return failure("Não foi possível concluir a importação do informe anual", 500);
  }
}

export async function listAnnualEmploymentIncomeStatements() {
  try {
    const userId = await getAuthenticatedUserId();
    const statements = await prisma.annualEmploymentIncomeStatement.findMany({
      where: { userId },
      orderBy: [{ calendarYear: "desc" }, { payerName: "asc" }],
      select: {
        id: true,
        calendarYear: true,
        taxExercise: true,
        payerName: true,
        payerTaxId: true,
        beneficiaryName: true,
        incomeNature: true,
        taxableIncomeCents: true,
        officialPensionCents: true,
        complementaryPensionCents: true,
        alimonyCents: true,
        irrfCents: true,
        thirteenthSalaryCents: true,
        thirteenthIrrfCents: true,
        exemptIncome: true,
        exclusiveTaxation: true,
        accumulatedIncome: true,
        notes: true,
        warnings: true,
        lifecycleStatus: true,
        supersedesId: true,
        supersededAt: true,
        archivedAt: true,
        supersededBy: { select: { id: true } },
        createdAt: true,
      },
    });
    return success(statements);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    return failure("Não foi possível carregar os informes anuais", 500);
  }
}

export async function archiveAnnualEmploymentIncomeStatement(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const statement = await prisma.annualEmploymentIncomeStatement.findFirst({
      where: { id, userId, lifecycleStatus: "ACTIVE" },
      select: { id: true },
    });
    if (!statement) return failure("Informe anual ativo não encontrado", 404);

    await prisma.annualEmploymentIncomeStatement.update({
      where: { id: statement.id },
      data: {
        lifecycleStatus: "ARCHIVED",
        archivedAt: new Date(),
      },
    });

    return success({ id: statement.id, archived: true }, "Informe anual arquivado");
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    return failure("Não foi possível arquivar o informe anual", 500);
  }
}
