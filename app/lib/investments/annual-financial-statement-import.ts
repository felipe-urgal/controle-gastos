import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  annualFinancialStatementFingerprint,
  parseNubankAnnualFinancialStatementText,
} from "@/app/lib/investments/annual-financial-statement-parser";
import {
  signAnnualFinancialStatementPreview,
  verifyAnnualFinancialStatementPreview,
} from "@/app/lib/investments/annual-financial-statement-preview-token";
import {
  formatInvestmentQuantity,
  parseInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  extractPdfText,
  PdfExperimentError,
  PDF_EXPERIMENT_MAX_BYTES,
} from "@/app/lib/transactions/import/pdf-experiment";

const positionSchema = z.object({
  type: z.enum(["CASH", "FIXED_INCOME", "FII", "CRYPTO", "OTHER"]),
  symbol: z.string().max(24).nullable(),
  description: z.string().min(1).max(500),
  currency: z.literal("BRL"),
  previousYearQuantity: z.string().nullable(),
  currentYearQuantity: z.string().nullable(),
  previousYearCostCents: z.number().int().nonnegative().nullable(),
  currentYearCostCents: z.number().int().nonnegative().nullable(),
  previousYearBalanceCents: z.number().int().nonnegative().nullable(),
  currentYearBalanceCents: z.number().int().nonnegative().nullable(),
  sourceInstitution: z.string().max(180).nullable(),
  sourceInstitutionCnpj: z.string().max(18).nullable(),
  category: z.string().max(500).nullable(),
});

const incomeSchema = z.object({
  symbol: z.string().max(24).nullable(),
  description: z.string().min(1).max(500),
  incomeType: z.enum(["DIVIDEND", "INTEREST", "INCOME", "OTHER"]),
  currency: z.literal("BRL"),
  amountCents: z.number().int().nonnegative().nullable(),
  payerName: z.string().max(180).nullable(),
  payerCnpj: z.string().max(18).nullable(),
  category: z.string().max(500).nullable(),
});

const withholdingSchema = z.object({
  symbol: z.string().max(24).nullable(),
  description: z.string().min(1).max(500),
  currency: z.literal("BRL"),
  amountCents: z.number().int().nonnegative().nullable(),
});

const statementSchema = z.object({
  calendarYear: z.number().int().min(0).max(2100),
  sourceInstitution: z.string().min(1).max(180),
  sourceInstitutionCnpj: z.string().max(18).nullable(),
  documentType: z.literal("NUBANK_ANNUAL_FINANCIAL_STATEMENT"),
  positions: z.array(positionSchema).max(500),
  incomes: z.array(incomeSchema).max(1000),
  taxWithholdings: z.array(withholdingSchema).max(1000),
  notes: z.array(z.string().max(1000)).max(500),
  warnings: z.array(z.string().max(1000)).max(500),
  errors: z.array(z.string().max(1000)).max(500),
  fingerprint: z.string().length(64),
  duplicate: z.boolean(),
});

const confirmSchema = z.object({
  previewToken: z.string().min(1),
  selected: z.boolean(),
  statement: statementSchema,
});

const baselineSchema = z.object({
  statementId: z.string().uuid(),
  positionIndex: z.number().int().nonnegative(),
});

function unauthorized(error: unknown) {
  return isUnauthorizedError(error) ? failure("Não autorizado", 401) : null;
}

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function serializedPosition(value: Prisma.JsonValue, index: number) {
  if (!Array.isArray(value)) return null;
  return positionSchema.safeParse(value[index]).success
    ? positionSchema.parse(value[index])
    : null;
}

function dateFromParts(value: { year: number; month: number; day: number }) {
  return (
    String(value.year).padStart(4, "0") +
    "-" +
    String(value.month).padStart(2, "0") +
    "-" +
    String(value.day).padStart(2, "0")
  );
}

export async function previewAnnualFinancialTaxStatement(request: Request) {
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
    if (!(file instanceof File)) {
      return failure("Selecione um informe anual financeiro em PDF", 400);
    }
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > PDF_EXPERIMENT_MAX_BYTES) {
      return failure("PDF excede o limite de 2 MB", 413);
    }
    if (file.name.toLowerCase().split(".").pop() !== "pdf") {
      return failure("Formato não suportado. Envie um arquivo PDF", 400);
    }

    let extracted: ReturnType<typeof extractPdfText>;
    try {
      extracted = extractPdfText(new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      if (
        error instanceof PdfExperimentError &&
        /sem texto extraível/i.test(error.message)
      ) {
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
      parsed = parseNubankAnnualFinancialStatementText(extracted.text);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ANNUAL_FINANCIAL_STATEMENT_NOT_RECOGNIZED"
      ) {
        return failure(
          "PDF não reconhecido como informe anual financeiro do Nubank",
          400,
        );
      }
      throw error;
    }

    const fingerprint = annualFinancialStatementFingerprint(userId, parsed);
    const existing = await prisma.annualFinancialTaxStatement.findUnique({
      where: {
        userId_importFingerprint: {
          userId,
          importFingerprint: fingerprint,
        },
      },
      select: { id: true },
    });
    const statement = {
      ...parsed,
      fingerprint,
      duplicate: Boolean(existing),
    };

    return success({
      fileName: file.name,
      pageCount: extracted.pageCount,
      requiresOcr: false,
      previewToken: signAnnualFinancialStatementPreview(userId, statement),
      statement,
      warnings: [...extracted.warnings, ...parsed.warnings],
    });
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof PdfExperimentError) return failure(error.message, 400);
    return failure("Não foi possível analisar o informe anual financeiro", 500);
  }
}

export async function confirmAnnualFinancialTaxStatement(request: Request) {
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

    verifyAnnualFinancialStatementPreview(
      input.previewToken,
      userId,
      input.statement,
    );

    if (input.statement.errors.length > 0) {
      return failure("O informe possui pendências que impedem a importação", 400);
    }
    if (input.statement.calendarYear < 2000) {
      return failure("Informe sem ano-calendário válido", 400);
    }
    if (
      input.statement.positions.length === 0 &&
      input.statement.incomes.length === 0
    ) {
      return failure("Nenhum dado fiscal reconhecido para persistência", 400);
    }

    const existing = await prisma.annualFinancialTaxStatement.findUnique({
      where: {
        userId_importFingerprint: {
          userId,
          importFingerprint: input.statement.fingerprint,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return success(
        { created: false, duplicate: true, id: existing.id },
        "Informe já importado",
      );
    }

    const created = await prisma.annualFinancialTaxStatement.create({
      data: {
        userId,
        calendarYear: input.statement.calendarYear,
        sourceInstitution: input.statement.sourceInstitution,
        sourceInstitutionCnpj: input.statement.sourceInstitutionCnpj,
        documentType: input.statement.documentType,
        positions: json(input.statement.positions),
        incomes: json(input.statement.incomes),
        taxWithholdings: json(input.statement.taxWithholdings),
        notes: json(input.statement.notes),
        warnings: json(input.statement.warnings),
        importFingerprint: input.statement.fingerprint,
      },
      select: { id: true },
    });

    return success(
      { created: true, duplicate: false, id: created.id },
      "Informe anual financeiro importado",
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
    return failure("Não foi possível concluir a importação do informe anual", 500);
  }
}

export async function listAnnualFinancialTaxStatements() {
  try {
    const userId = await getAuthenticatedUserId();
    const statements = await prisma.annualFinancialTaxStatement.findMany({
      where: { userId },
      orderBy: [
        { calendarYear: "desc" },
        { sourceInstitution: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        calendarYear: true,
        sourceInstitution: true,
        sourceInstitutionCnpj: true,
        documentType: true,
        positions: true,
        incomes: true,
        taxWithholdings: true,
        notes: true,
        warnings: true,
        createdAt: true,
      },
    });
    return success(statements);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    return failure("Não foi possível carregar os informes anuais financeiros", 500);
  }
}

export async function applyAnnualFinancialStatementBaseline(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = baselineSchema.parse(await request.json());

    const statement = await prisma.annualFinancialTaxStatement.findFirst({
      where: { id: input.statementId, userId },
      select: {
        id: true,
        calendarYear: true,
        sourceInstitution: true,
        positions: true,
      },
    });
    if (!statement) return failure("Informe anual não encontrado", 404);

    const position = serializedPosition(statement.positions, input.positionIndex);
    if (!position) return failure("Posição do informe não encontrada", 404);
    if (!position.symbol) {
      return failure("A posição não possui ativo identificável", 409);
    }
    if (
      position.currentYearQuantity === null ||
      position.currentYearCostCents === null
    ) {
      return failure(
        "O informe não possui quantidade e custo de aquisição explícitos para este ativo",
        409,
      );
    }

    const quantityUnits = parseInvestmentQuantity(position.currentYearQuantity);
    if (quantityUnits === null) {
      return failure("Quantidade do informe inválida para baseline fiscal", 400);
    }

    const asset = await prisma.investmentAsset.findFirst({
      where: {
        userId,
        symbol: { equals: position.symbol, mode: "insensitive" },
        currency: position.currency,
      },
      select: { id: true, symbol: true },
    });
    if (!asset) {
      return failure(
        "Ativo ainda não existe no sistema. Vincule/cadastre o ativo antes de aplicar o baseline",
        409,
      );
    }

    const reason =
      "Baseline fiscal confirmado a partir do informe anual " +
      statement.sourceInstitution +
      " · " +
      statement.calendarYear +
      " · " +
      position.symbol +
      " · documento " +
      statement.id;

    const existing = await prisma.investmentFiscalCostAdjustment.findFirst({
      where: {
        userId,
        assetId: asset.id,
        quantityUnits,
        costBasisCents: position.currentYearCostCents,
        year: statement.calendarYear,
        month: 12,
        day: 31,
        sourceInstitution: statement.sourceInstitution,
        reason,
      },
    });
    if (existing) {
      return success({
        created: false,
        id: existing.id,
        assetId: asset.id,
        symbol: asset.symbol,
        quantity: formatInvestmentQuantity(existing.quantityUnits),
        costBasisCents: existing.costBasisCents,
        date: dateFromParts(existing),
        reason: existing.reason,
        sourceInstitution: existing.sourceInstitution,
      }, "Baseline fiscal já aplicado");
    }

    const created = await prisma.investmentFiscalCostAdjustment.create({
      data: {
        userId,
        assetId: asset.id,
        quantityUnits,
        costBasisCents: position.currentYearCostCents,
        year: statement.calendarYear,
        month: 12,
        day: 31,
        reason,
        sourceInstitution: statement.sourceInstitution,
      },
    });

    return success({
      created: true,
      id: created.id,
      assetId: asset.id,
      symbol: asset.symbol,
      quantity: formatInvestmentQuantity(created.quantityUnits),
      costBasisCents: created.costBasisCents,
      date: dateFromParts(created),
      reason: created.reason,
      sourceInstitution: created.sourceInstitution,
    }, "Baseline fiscal registrado", 201);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    return failure("Não foi possível aplicar o baseline fiscal", 500);
  }
}
