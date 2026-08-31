import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ITEMS,
  ImportParseError,
  PreviewImportItem,
  parseImportContent,
  parseImportDate,
  withImportFingerprints,
} from "@/app/lib/transactions/import/parser";
import {
  signImportPreviewToken,
  verifyImportPreviewToken,
} from "@/app/lib/transactions/import/preview-token";
import {
  ConfirmTransactionImportInput,
  confirmTransactionImportSchema,
} from "@/app/schemas/transaction-import.schema";

const MAX_TRANSACTION_AMOUNT_CENTS = 1_000_000_000;

function unauthorizedResponse(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED"
    ? failure("Não autorizado", 401)
    : null;
}

function previewItemFromConfirmation(
  item: ConfirmTransactionImportInput["items"][number],
): PreviewImportItem {
  return {
    index: item.index,
    source: item.source,
    date: item.date,
    amountCents: item.amountCents,
    type: item.type,
    description: item.description,
    externalId: item.externalId,
    currency: item.currency,
    errors: item.errors,
    fingerprint: item.fingerprint,
    duplicate: item.duplicate,
  };
}

export async function previewTransactionImport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const formData = await request.formData();
    const accountId = formData.get("accountId");
    const file = formData.get("file");

    if (typeof accountId !== "string" || !accountId) {
      return failure("Selecione uma conta válida", 400);
    }
    if (!(file instanceof File)) {
      return failure("Selecione um arquivo CSV ou OFX", 400);
    }
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > IMPORT_MAX_FILE_BYTES) {
      return failure("Arquivo excede o limite de 2 MB", 413);
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true, currency: true },
    });
    if (!account) return failure("Conta inválida ou inativa", 400);

    const content = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    const parsed = parseImportContent({
      fileName: file.name,
      content,
      accountCurrency: account.currency,
    }).map((item) =>
      item.amountCents > MAX_TRANSACTION_AMOUNT_CENTS
        ? { ...item, errors: [...item.errors, "Valor excede o limite permitido por transação."] }
        : item,
    );
    const fingerprinted = withImportFingerprints({ userId, accountId, items: parsed });
    const candidateFingerprints = fingerprinted
      .filter((item) => item.errors.length === 0)
      .map((item) => item.fingerprint);

    const existing = candidateFingerprints.length
      ? await prisma.transaction.findMany({
          where: {
            userId,
            importFingerprint: { in: candidateFingerprints },
          },
          select: { importFingerprint: true },
        })
      : [];
    const existingFingerprints = new Set(
      existing.flatMap((item) => item.importFingerprint ? [item.importFingerprint] : []),
    );
    const items = fingerprinted.map((item) => ({
      ...item,
      duplicate: item.errors.length === 0 && existingFingerprints.has(item.fingerprint),
    }));
    const previewToken = signImportPreviewToken({ userId, accountId, items });

    return success({
      accountId,
      fileName: file.name,
      previewToken,
      limits: {
        maxFileBytes: IMPORT_MAX_FILE_BYTES,
        maxItems: IMPORT_MAX_ITEMS,
      },
      summary: {
        total: items.length,
        valid: items.filter((item) => item.errors.length === 0 && !item.duplicate).length,
        invalid: items.filter((item) => item.errors.length > 0).length,
        duplicates: items.filter((item) => item.duplicate).length,
      },
      items,
    });
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    if (error instanceof ImportParseError) return failure(error.message, 400);
    console.error("Erro ao gerar preview de importação", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível analisar o arquivo", 500);
  }
}

export async function confirmTransactionImport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = confirmTransactionImportSchema.parse(await request.json());
    const previewItems = input.items.map(previewItemFromConfirmation);

    try {
      verifyImportPreviewToken({
        token: input.previewToken,
        userId,
        accountId: input.accountId,
        items: previewItems,
      });
    } catch {
      return failure("Preview expirado ou inválido. Gere um novo preview antes de confirmar", 400);
    }

    const selected = input.items.filter((item) => item.selected);
    if (selected.length === 0) return failure("Selecione ao menos uma transação válida", 400);

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId, isActive: true },
        select: { id: true },
      });
      if (!account) throw new Error("INVALID_ACCOUNT");

      const importable = selected.filter((item) => !item.duplicate);
      for (const item of importable) {
        if (item.errors.length > 0) throw new Error("INVALID_ITEM");
        if (
          !parseImportDate(item.date) ||
          item.amountCents <= 0 ||
          item.amountCents > MAX_TRANSACTION_AMOUNT_CENTS ||
          item.description.length < 2
        ) {
          throw new Error("INVALID_ITEM");
        }
        if (!item.categoryId) throw new Error("MISSING_CATEGORY");
      }

      const categoryIds = [...new Set(importable.flatMap((item) => item.categoryId ? [item.categoryId] : []))];
      const categories = categoryIds.length
        ? await tx.category.findMany({
            where: { id: { in: categoryIds }, userId, isActive: true },
            select: { id: true, type: true },
          })
        : [];
      const categoryById = new Map(categories.map((category) => [category.id, category]));

      for (const item of importable) {
        const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
        if (!category) throw new Error("INVALID_CATEGORY");
        if (category.type !== item.type) throw new Error("CATEGORY_TYPE_MISMATCH");
      }

      const existing = importable.length
        ? await tx.transaction.findMany({
            where: {
              userId,
              importFingerprint: { in: importable.map((item) => item.fingerprint) },
            },
            select: { importFingerprint: true },
          })
        : [];
      const existingFingerprints = new Set(
        existing.flatMap((item) => item.importFingerprint ? [item.importFingerprint] : []),
      );
      const newItems = importable.filter((item) => !existingFingerprints.has(item.fingerprint));

      const created = newItems.length
        ? await tx.transaction.createMany({
            data: newItems.map((item) => {
              const [year, month, day] = item.date.split("-").map(Number);
              return {
                amount: item.amountCents,
                year,
                month,
                day,
                type: item.type,
                description: item.description,
                status: "COMPLETED" as const,
                accountId: input.accountId,
                categoryId: item.categoryId!,
                userId,
                importSource: item.source,
                importFingerprint: item.fingerprint,
                importExternalId: item.externalId ?? null,
              };
            }),
            skipDuplicates: true,
          })
        : { count: 0 };

      return {
        selected: selected.length,
        created: created.count,
        duplicates: selected.length - created.count,
      };
    });

    return success(result, "Importação confirmada com sucesso", 201);
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (error instanceof Error) {
      if (error.message === "INVALID_ACCOUNT") return failure("Conta inválida ou inativa", 400);
      if (error.message === "INVALID_ITEM") return failure("Há itens selecionados inválidos", 400);
      if (error.message === "MISSING_CATEGORY") return failure("Defina uma categoria para cada item selecionado", 400);
      if (error.message === "INVALID_CATEGORY") return failure("Categoria inválida ou inativa", 400);
      if (error.message === "CATEGORY_TYPE_MISMATCH") {
        return failure("A categoria precisa ter o mesmo tipo da transação", 400);
      }
    }
    console.error("Erro ao confirmar importação", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível concluir a importação", 500);
  }
}
