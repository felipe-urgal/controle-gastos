import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  parsePayrollText,
  payrollDocumentIdentity,
  payrollImportFingerprint,
  type ParsedPayrollDocument,
} from "@/app/lib/payroll/payroll-parser";
import {
  signPayrollPreview,
  verifyPayrollPreview,
} from "@/app/lib/payroll/preview-token";
import { reconcilePayrollCompetence } from "@/app/lib/payroll/payroll-reconciliation";
import {
  assertPayrollDocumentMoneyBounds,
  isPayrollMoneyLimitError,
  PAYROLL_CENTS_MAX,
} from "@/app/lib/payroll/payroll-money";
import { prisma } from "@/app/lib/prisma";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  extractPdfText,
  PdfExperimentError,
  PDF_EXPERIMENT_MAX_BYTES,
} from "@/app/lib/transactions/import/pdf-experiment";

const centsSchema = z.number().int().nonnegative().max(PAYROLL_CENTS_MAX);

const rubricSchema = z.object({
  code: z.string().nullable(),
  description: z.string(),
  reference: z.string().nullable(),
  earningsCents: centsSchema.nullable(),
  deductionsCents: centsSchema.nullable(),
});

const paymentTypeSchema = z.enum([
  "ADVANCE",
  "REGULAR",
  "THIRTEENTH",
  "VACATION",
  "PLR",
  "OTHER",
]);

const parsedSchema = z.object({
  documentType: z.enum(["PAYROLL_ADVANCE", "MONTHLY_PAYSLIP"]),
  paymentType: paymentTypeSchema,
  employerName: z.string().min(1).max(160),
  employerCnpj: z.string().max(18),
  employeeName: z.string().max(160).nullable(),
  year: z.number().int().min(0).max(2100),
  month: z.number().int().min(0).max(12),
  salaryBaseCents: centsSchema.nullable(),
  grossIncomeCents: centsSchema.nullable(),
  totalEarningsCents: centsSchema.nullable(),
  totalDeductionsCents: centsSchema.nullable(),
  netPaidCents: centsSchema.nullable(),
  inssCents: centsSchema.nullable(),
  irrfCents: centsSchema.nullable(),
  irrfBaseCents: centsSchema.nullable(),
  fgtsBaseCents: centsSchema.nullable(),
  fgtsAmountCents: centsSchema.nullable(),
  earnings: z.array(rubricSchema),
  deductions: z.array(rubricSchema),
  bankMetadata: z.record(z.string(), z.string()).nullable(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  fingerprint: z.string().length(64),
  duplicate: z.boolean(),
});

const confirmSchema = z.object({
  previewToken: z.string().min(1),
  selected: z.boolean(),
  document: parsedSchema,
  paymentType: paymentTypeSchema.optional(),
  supersedesId: z.string().uuid().nullable().optional(),
});

function unauthorized(error: unknown) {
  return isUnauthorizedError(error) ? failure("Não autorizado", 401) : null;
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function paymentTypeMatchesDocument(
  documentType: z.infer<typeof parsedSchema>["documentType"],
  paymentType: z.infer<typeof paymentTypeSchema>,
) {
  return documentType === "PAYROLL_ADVANCE"
    ? paymentType === "ADVANCE"
    : paymentType !== "ADVANCE";
}

async function findPayrollImportReplay(userId: string, fingerprint: string) {
  return prisma.payrollDocument.findUnique({
    where: {
      userId_importFingerprint: {
        userId,
        importFingerprint: fingerprint,
      },
    },
    select: { id: true },
  });
}

export async function previewPayrollImport(request: Request) {
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
    if (!(file instanceof File)) return failure("Selecione um holerite em PDF", 400);
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > PDF_EXPERIMENT_MAX_BYTES) return failure("PDF excede o limite de 2 MB", 413);
    if (file.name.toLowerCase().split(".").pop() !== "pdf") {
      return failure("Formato não suportado. Envie um arquivo PDF", 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let extracted: ReturnType<typeof extractPdfText>;
    try {
      extracted = extractPdfText(bytes);
    } catch (error) {
      if (
        error instanceof PdfExperimentError &&
        /sem texto extraível/i.test(error.message)
      ) {
        return success({
          fileName: file.name,
          requiresOcr: true,
          detectedType: null,
          previewToken: null,
          replacementCandidates: [],
          document: null,
          warnings: [
            "PDF sem texto extraível. OCR/revisão manual é necessário; nenhum dado foi inferido ou persistido.",
          ],
        });
      }
      throw error;
    }

    let parsed: ParsedPayrollDocument;
    try {
      parsed = parsePayrollText(extracted.text);
    } catch (error) {
      if (error instanceof Error && error.message === "PAYROLL_DOCUMENT_NOT_RECOGNIZED") {
        return failure("PDF não reconhecido como documento de rendimento do trabalho", 400);
      }
      throw error;
    }

    assertPayrollDocumentMoneyBounds(parsed);
    const fingerprint = payrollImportFingerprint(userId, parsed);
    const identity = payrollDocumentIdentity(parsed);
    const [existing, replacementCandidates] = await Promise.all([
      prisma.payrollDocument.findUnique({
        where: {
          userId_importFingerprint: {
            userId,
            importFingerprint: fingerprint,
          },
        },
        select: { id: true },
      }),
      prisma.payrollDocument.findMany({
        where: {
          userId,
          lifecycleStatus: "ACTIVE",
          documentType: identity.documentType,
          employerCnpj: identity.employerCnpj,
          year: identity.year,
          month: identity.month,
          importFingerprint: { not: fingerprint },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          paymentType: true,
          createdAt: true,
          netPaidCents: true,
        },
      }),
    ]);
    const document = {
      ...parsed,
      fingerprint,
      duplicate: Boolean(existing),
    };
    const previewToken = signPayrollPreview({ userId, document });

    return success({
      fileName: file.name,
      requiresOcr: false,
      pageCount: extracted.pageCount,
      detectedType: parsed.documentType,
      previewToken,
      document,
      replacementCandidates,
      warnings: [
        ...extracted.warnings,
        ...parsed.warnings,
        ...(replacementCandidates.length > 1
          ? ["Há mais de uma versão ativa para esta identidade documental; escolha explicitamente qual versão será substituída."]
          : []),
      ],
    });
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof PdfExperimentError) return failure(error.message, 400);
    if (isPayrollMoneyLimitError(error)) {
      return failure(
        `Valor monetário inválido ou acima do limite em ${error.field}`,
        400,
      );
    }
    return failure("Não foi possível analisar o documento de folha", 500);
  }
}

type ConfirmedPayrollDocument = z.infer<typeof parsedSchema>;

export async function persistPayrollImportAtomically(params: {
  userId: string;
  document: ConfirmedPayrollDocument;
  supersedesId: string | null;
  reconcile?: typeof reconcilePayrollCompetence;
}) {
  const identity = payrollDocumentIdentity(params.document);
  const reconcile = params.reconcile ?? reconcilePayrollCompetence;

  return prisma.$transaction(async (tx) => {
    if (params.supersedesId) {
      const target = await tx.payrollDocument.findFirst({
        where: {
          id: params.supersedesId,
          userId: params.userId,
          lifecycleStatus: "ACTIVE",
          documentType: identity.documentType,
          employerCnpj: identity.employerCnpj,
          year: identity.year,
          month: identity.month,
        },
        select: { id: true },
      });
      if (!target) {
        throw new Error("INVALID_SUPERSEDES_TARGET");
      }

      await tx.payrollTransactionLink.deleteMany({
        where: { userId: params.userId, payrollDocumentId: target.id },
      });
      await tx.payrollAdvanceLink.deleteMany({
        where: {
          userId: params.userId,
          OR: [
            { advanceDocumentId: target.id },
            { regularDocumentId: target.id },
          ],
        },
      });
      await tx.payrollDocument.update({
        where: { id: target.id },
        data: {
          lifecycleStatus: "SUPERSEDED",
          supersededAt: new Date(),
        },
      });
    }

    const created = await tx.payrollDocument.create({
      data: {
        userId: params.userId,
        documentType: params.document.documentType,
        paymentType: params.document.paymentType,
        employerName: params.document.employerName,
        employerCnpj: params.document.employerCnpj,
        employeeName: params.document.employeeName,
        year: params.document.year,
        month: params.document.month,
        salaryBaseCents: params.document.salaryBaseCents,
        grossIncomeCents: params.document.grossIncomeCents,
        totalEarningsCents: params.document.totalEarningsCents,
        totalDeductionsCents: params.document.totalDeductionsCents,
        netPaidCents: params.document.netPaidCents,
        inssCents: params.document.inssCents,
        irrfCents: params.document.irrfCents,
        irrfBaseCents: params.document.irrfBaseCents,
        fgtsBaseCents: params.document.fgtsBaseCents,
        fgtsAmountCents: params.document.fgtsAmountCents,
        earnings: toJson(params.document.earnings),
        deductions: toJson(params.document.deductions),
        bankMetadata: params.document.bankMetadata
          ? toJson(params.document.bankMetadata)
          : Prisma.JsonNull,
        warnings: toJson(params.document.warnings),
        importFingerprint: params.document.fingerprint,
        supersedesId: params.supersedesId,
      },
      select: { id: true },
    });

    await reconcile(
      {
        userId: params.userId,
        employerCnpj: params.document.employerCnpj,
        year: params.document.year,
        month: params.document.month,
      },
      tx,
    );

    return created;
  });
}

export async function confirmPayrollImport(request: Request) {
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
    if (!input.selected) return failure("Selecione o documento para importar", 400);

    verifyPayrollPreview({
      token: input.previewToken,
      userId,
      document: input.document,
    });

    if (input.document.errors.length > 0) {
      return failure("O documento possui pendências que impedem a importação", 400);
    }
    if (
      !input.document.employerCnpj ||
      input.document.year < 2000 ||
      input.document.month < 1 ||
      input.document.month > 12
    ) {
      return failure("Documento incompleto para persistência", 400);
    }

    const paymentType = input.paymentType ?? input.document.paymentType;
    if (!paymentTypeMatchesDocument(input.document.documentType, paymentType)) {
      return failure("Classificação incompatível com o tipo de documento", 400);
    }

    const confirmedDocument = {
      ...input.document,
      paymentType,
      duplicate: false,
    };
    confirmedDocument.fingerprint = payrollImportFingerprint(
      userId,
      confirmedDocument,
    );

    const existing = await findPayrollImportReplay(
      userId,
      confirmedDocument.fingerprint,
    );
    if (existing) {
      return success(
        { created: false, duplicate: true, id: existing.id },
        "Documento já importado",
      );
    }

    try {
      const created = await persistPayrollImportAtomically({
        userId,
        document: confirmedDocument,
        supersedesId: input.supersedesId ?? null,
      });

      return success(
        { created: true, duplicate: false, id: created.id },
        "Documento de folha importado",
        201,
      );
    } catch (error) {
      const replayableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      const supersedeRace =
        error instanceof Error &&
        error.message === "INVALID_SUPERSEDES_TARGET";

      if (replayableConflict || supersedeRace) {
        const replay = await findPayrollImportReplay(
          userId,
          confirmedDocument.fingerprint,
        );
        if (replay) {
          return success(
            { created: false, duplicate: true, id: replay.id },
            "Documento já importado",
          );
        }
      }
      throw error;
    }
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isPayrollMoneyLimitError(error)) {
      return failure(
        `Valor monetário inválido ou acima do limite em ${error.field}`,
        400,
      );
    }
    if (error instanceof Error && error.message === "INVALID_PREVIEW_TOKEN") {
      return failure("Preview expirado ou inválido. Gere um novo preview", 400);
    }
    if (error instanceof Error && error.message === "INVALID_SUPERSEDES_TARGET") {
      return failure("A versão escolhida para substituição não está mais ativa ou não pertence ao mesmo documento", 409);
    }
    return failure("Não foi possível concluir a importação do documento de folha", 500);
  }
}

export async function listPayrollDocuments() {
  try {
    const userId = await getAuthenticatedUserId();
    const documents = await prisma.payrollDocument.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        documentType: true,
        paymentType: true,
        employerName: true,
        employerCnpj: true,
        employeeName: true,
        year: true,
        month: true,
        grossIncomeCents: true,
        totalEarningsCents: true,
        totalDeductionsCents: true,
        netPaidCents: true,
        inssCents: true,
        irrfCents: true,
        earnings: true,
        deductions: true,
        warnings: true,
        lifecycleStatus: true,
        supersedesId: true,
        supersededAt: true,
        archivedAt: true,
        supersededBy: { select: { id: true } },
        createdAt: true,
      },
    });
    return success(documents);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    return failure("Não foi possível carregar os documentos de folha", 500);
  }
}

export async function archivePayrollDocument(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const document = await prisma.payrollDocument.findFirst({
      where: { id, userId, lifecycleStatus: "ACTIVE" },
      select: {
        id: true,
        employerCnpj: true,
        year: true,
        month: true,
      },
    });
    if (!document) return failure("Documento ativo não encontrado", 404);

    await prisma.$transaction(async (tx) => {
      await tx.payrollTransactionLink.deleteMany({
        where: { userId, payrollDocumentId: document.id },
      });
      await tx.payrollAdvanceLink.deleteMany({
        where: {
          userId,
          OR: [
            { advanceDocumentId: document.id },
            { regularDocumentId: document.id },
          ],
        },
      });
      await tx.payrollDocument.update({
        where: { id: document.id },
        data: {
          lifecycleStatus: "ARCHIVED",
          archivedAt: new Date(),
        },
      });
    });

    await reconcilePayrollCompetence({
      userId,
      employerCnpj: document.employerCnpj,
      year: document.year,
      month: document.month,
    });

    return success({ id: document.id, archived: true }, "Documento arquivado");
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    return failure("Não foi possível arquivar o documento de folha", 500);
  }
}
