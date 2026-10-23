import { wrongDocumentMessage } from "@/app/lib/documents/document-guess";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { compareCustodyWithPortfolio } from "@/app/lib/investments/custody-statement-compare";
import { isCustodyStatement, parseNubankCustodyStatementText } from "@/app/lib/investments/custody-statement-parser";
import { listInvestmentPortfolioForUser } from "@/app/lib/investments/investments";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import { extractPdfText, PdfExperimentError, PDF_EXPERIMENT_MAX_BYTES } from "@/app/lib/transactions/import/pdf-experiment";

/**
 * Conferência (somente leitura) do Extrato de Custódia do Nubank com a carteira do app.
 * Nada é gravado: o documento é uma foto das posições numa data e serve para apontar diferenças.
 */
export async function compareCustodyStatement(request: Request) {
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
    if (!(file instanceof File)) return failure("Selecione o extrato de custódia em PDF", 400);
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > PDF_EXPERIMENT_MAX_BYTES) return failure("PDF excede o limite de 2 MB", 413);
    if (file.name.toLowerCase().split(".").pop() !== "pdf") return failure("Formato não suportado. Envie um arquivo PDF", 400);

    let text: string;
    try {
      text = extractPdfText(new Uint8Array(await file.arrayBuffer())).text;
    } catch (error) {
      if (error instanceof PdfExperimentError && /sem texto extraível/i.test(error.message)) {
        return failure("PDF sem texto extraível. Baixe o extrato de custódia direto do app, sem imprimir ou digitalizar.", 400);
      }
      throw error;
    }

    if (!isCustodyStatement(text)) {
      return failure(wrongDocumentMessage(text, "um extrato de custódia do Nubank"), 400);
    }

    const statement = parseNubankCustodyStatementText(text);
    const portfolio = await listInvestmentPortfolioForUser(userId);
    const comparison = compareCustodyWithPortfolio(
      statement.equities,
      portfolio.positions.map((position) => ({
        symbol: position.symbol,
        currency: position.currency,
        quantity: position.quantity,
        investedCents: position.investedCents,
        marketValueCents: position.marketValueCents,
      })),
    );

    return success({
      fileName: file.name,
      referenceDate: statement.referenceDate,
      summary: statement.summary,
      fixedIncome: statement.fixedIncome,
      comparison,
      warnings: statement.warnings,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível analisar o extrato de custódia", 500);
  }
}
