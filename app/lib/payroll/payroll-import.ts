import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  parsePayrollText,
  payrollImportFingerprint,
  type ParsedPayrollDocument,
} from "@/app/lib/payroll/payroll-parser";
import {
  signPayrollPreview,
  verifyPayrollPreview,
} from "@/app/lib/payroll/preview-token";
import { prisma } from "@/app/lib/prisma";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  extractPdfText,
  PdfExperimentError,
  PDF_EXPERIMENT_MAX_BYTES,
} from "@/app/lib/transactions/import/pdf-experiment";

const rubricSchema = z.object({
  code: z.string().nullable(),
  description: z.string(),
  reference: z.string().nullable(),
  earningsCents: z.number().int().nonnegative().nullable(),
  deductionsCents: z.number().int().nonnegative().nullable(),
});

const parsedSchema = z.object({
  documentType: z.enum(["PAYROLL_ADVANCE", "MONTHLY_PAYSLIP"]),
  paymentType: z.enum(["ADVANCE", "REGULAR"]),
  employerName: z.string().min(1).max(160),
  employerCnpj: z.string().max(18),
  employeeName: z.string().max(160).nullable(),
  year: z.number().int().min(0).max(2100),
  month: z.number().int().min(0).max(12),
  salaryBaseCents: z.number().int().nonnegative().nullable(),
  grossIncomeCents: z.number().int().nonnegative().nullable(),
  totalEarningsCents: z.number().int().nonnegative().nullable(),
  totalDeductionsCents: z.number().int().nonnegative().nullable(),
  netPaidCents: z.number().int().nonnegative().nullable(),
  inssCents: z.number().int().nonnegative().nullable(),
  irrfCents: z.number().int().nonnegative().nullable(),
  irrfBaseCents: z.number().int().nonnegative().nullable(),
  fgtsBaseCents: z.number().int().nonnegative().nullable(),
  fgtsAmountCents: z.number().int().nonnegative().nullable(),
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
});

function unauthorized(error: unknown) {
  return isUnauthorizedError(error) ? failure("Não autorizado", 401) : null;
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
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
        return failure("PDF não reconhecido como adiantamento salarial ou folha mensal", 400);
      }
      throw error;
    }

    const fingerprint = payrollImportFingerprint(userId, parsed);
    const existing = await prisma.payrollDocument.findUnique({
      where: {
        userId_importFingerprint: {
          userId,
          importFingerprint: fingerprint,
        },
      },
      select: { id: true },
    });
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
      warnings: [...extracted.warnings, ...parsed.warnings],
    });
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof PdfExperimentError) return failure(error.message, 400);
    return failure("Não foi possível analisar o documento de folha", 500);
  }
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
    if (input.document.duplicate) {
      return success({ created: false, duplicate: true }, "Documento já importado");
    }
    if (
      !input.document.employerCnpj ||
      input.document.year < 2000 ||
      input.document.month < 1 ||
      input.document.month > 12
    ) {
      return failure("Documento incompleto para persistência", 400);
    }

    const existing = await prisma.payrollDocument.findUnique({
      where: {
        userId_importFingerprint: {
          userId,
          importFingerprint: input.document.fingerprint,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return success({ created: false, duplicate: true, id: existing.id }, "Documento já importado");
    }

    const created = await prisma.payrollDocument.create({
      data: {
        userId,
        documentType: input.document.documentType,
        paymentType: input.document.paymentType,
        employerName: input.document.employerName,
        employerCnpj: input.document.employerCnpj,
        employeeName: input.document.employeeName,
        year: input.document.year,
        month: input.document.month,
        salaryBaseCents: input.document.salaryBaseCents,
        grossIncomeCents: input.document.grossIncomeCents,
        totalEarningsCents: input.document.totalEarningsCents,
        totalDeductionsCents: input.document.totalDeductionsCents,
        netPaidCents: input.document.netPaidCents,
        inssCents: input.document.inssCents,
        irrfCents: input.document.irrfCents,
        irrfBaseCents: input.document.irrfBaseCents,
        fgtsBaseCents: input.document.fgtsBaseCents,
        fgtsAmountCents: input.document.fgtsAmountCents,
        earnings: toJson(input.document.earnings),
        deductions: toJson(input.document.deductions),
        bankMetadata: input.document.bankMetadata
          ? toJson(input.document.bankMetadata)
          : Prisma.JsonNull,
        warnings: toJson(input.document.warnings),
        importFingerprint: input.document.fingerprint,
      },
      select: { id: true },
    });

    return success({ created: true, duplicate: false, id: created.id }, "Documento de folha importado", 201);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (error instanceof Error && error.message === "INVALID_PREVIEW_TOKEN") {
      return failure("Preview expirado ou inválido. Gere um novo preview", 400);
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
