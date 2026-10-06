import { Prisma } from "@prisma/client";
import { ZodError, z } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  deriveInvestmentPositions,
  parseInvestmentQuantity,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";
import {
  parseInvestmentCsvRows,
  parseInvestmentRows,
  type PreviewInvestmentImportItem,
  withInvestmentImportFingerprints,
} from "@/app/lib/investments/import/investment-import-parser";
import { parseNubankBrokerageNotePdf } from "@/app/lib/investments/import/nubank-brokerage-note-parser";
import {
  signInvestmentImportPreview,
  verifyInvestmentImportPreview,
} from "@/app/lib/investments/import/preview-token";
import { sha256 } from "@/app/lib/idempotency";
import { prisma } from "@/app/lib/prisma";
import { consumeImportRateLimit } from "@/app/lib/security/application-rate-limit";
import { IMPORT_MAX_FILE_BYTES, ImportParseError } from "@/app/lib/transactions/import/parser";
import { parseXlsxRows } from "@/app/lib/transactions/import/xlsx-parser";

const MAX_CENTS = 2_147_483_647;

const baseItemSchema = z.object({
  index: z.number().int().nonnegative(),
  source: z.enum(["CSV", "XLSX", "PDF"]),
  date: z.string(),
  symbol: z.string().min(1).max(24),
  assetName: z.string().max(120).nullable(),
  assetType: z.enum(["STOCK", "FII", "ETF", "FIXED_INCOME", "CRYPTO", "FUND", "OTHER"]),
  institution: z.string(),
  quantity: z.string(),
  errors: z.array(z.string()),
  fingerprint: z.string().length(64),
  duplicate: z.boolean(),
  selected: z.boolean(),
});

const operationItemSchema = baseItemSchema.extend({
  kind: z.literal("OPERATIONS"),
  operationType: z.enum(["BUY", "SELL"]),
  movement: z.string(),
  unitPriceCents: z.number().int().positive().max(MAX_CENTS),
  feesCents: z.number().int().nonnegative().max(MAX_CENTS),
  amountCents: z.number().int().positive().max(MAX_CENTS),
  rawUnitPrice: z.string(),
  brokerageNote: z.object({
    broker: z.string(),
    brokerCnpj: z.string().nullable(),
    noteNumber: z.string(),
    tradeDate: z.string(),
    businessIndex: z.number().int().nonnegative(),
    market: z.string(),
    grossAmountCents: z.number().int().nonnegative().max(MAX_CENTS),
    allocatedFeesCents: z.number().int().nonnegative().max(MAX_CENTS),
    irrfCents: z.number().int().nonnegative().max(MAX_CENTS),
  }).optional(),
});

const incomeItemSchema = baseItemSchema.extend({
  kind: z.literal("INCOMES"),
  incomeType: z.enum(["INCOME", "DIVIDEND", "INTEREST", "OTHER"]),
  eventType: z.string(),
  unitValueCents: z.number().int().positive().max(MAX_CENTS),
  netAmountCents: z.number().int().positive().max(MAX_CENTS),
});

const confirmSchema = z.object({
  accountId: z.string().uuid(),
  previewToken: z.string().min(1),
  items: z.array(z.discriminatedUnion("kind", [operationItemSchema, incomeItemSchema])).max(1000),
});

function unauthorized(error: unknown) {
  return isUnauthorizedError(error) ? failure("Não autorizado", 401) : null;
}

function noteForItem(item: PreviewInvestmentImportItem) {
  const source =
    item.kind === "OPERATIONS"
      ? item.movement
      : item.eventType;
  const parts = [source, item.institution].filter(Boolean);
  if (item.kind === "OPERATIONS" && item.feesCents > 0) {
    parts.push(`Preço original: ${item.rawUnitPrice}; taxas: ${(
      item.feesCents / 100
    ).toFixed(2)}`);
  }
  if (item.kind === "OPERATIONS" && item.brokerageNote) {
    parts.push(
      [
        "NUBANK_BROKERAGE_NOTE",
        `nota ${item.brokerageNote.noteNumber}`,
        item.brokerageNote.brokerCnpj ?? item.brokerageNote.broker,
        `negócio ${item.brokerageNote.businessIndex + 1}`,
        `IRRF ${(item.brokerageNote.irrfCents / 100).toFixed(2)}`,
      ].join(" · "),
    );
  }
  return parts.join(" · ").slice(0, 500) || null;
}

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function brokerageNoteIdentity(item: {
  brokerageNote?: {
    noteNumber: string;
    tradeDate: string;
    broker: string;
    brokerCnpj: string | null;
  };
}) {
  const note = item.brokerageNote;
  if (!note) return null;
  return [
    note.noteNumber,
    note.tradeDate,
    note.brokerCnpj ?? note.broker,
  ].join("|");
}

function brokerageTaxFingerprint(
  userId: string,
  accountId: string,
  item: {
    brokerageNote?: {
      noteNumber: string;
      tradeDate: string;
      broker: string;
      brokerCnpj: string | null;
      irrfCents: number;
    };
  },
) {
  const note = item.brokerageNote;
  if (!note) throw new Error("BROKERAGE_NOTE_REQUIRED");
  return sha256(
    JSON.stringify([
      "INVESTMENT_BROKERAGE_IRRF_V1",
      userId,
      accountId,
      note.noteNumber,
      note.tradeDate,
      note.brokerCnpj ?? note.broker,
      note.irrfCents,
    ]),
  );
}

function brokerageTaxDisposition(
  items: Array<{
    kind: "OPERATIONS" | "INCOMES";
    assetType: string;
    brokerageNote?: {
      noteNumber: string;
      tradeDate: string;
      broker: string;
      brokerCnpj: string | null;
      irrfCents: number;
    };
  }>,
  identity: string,
) {
  const noteItems = items.filter(
    (item) =>
      item.kind === "OPERATIONS" &&
      brokerageNoteIdentity(item) === identity,
  );
  const irrfCents = noteItems[0]?.brokerageNote?.irrfCents ?? 0;
  if (irrfCents <= 0) {
    return {
      taxDestination: "NONE" as const,
      taxReason: "A nota não possui IRRF identificado.",
    };
  }
  const assetTypes = [...new Set(noteItems.map((item) => item.assetType))];
  if (assetTypes.length === 1) {
    return {
      taxDestination: "IRRF" as const,
      taxReason:
        "O IRRF total da nota será registrado uma única vez no grupo fiscal identificado.",
    };
  }
  return {
    taxDestination: "REVIEW_REQUIRED" as const,
    taxReason:
      "A nota mistura classes de ativos e o IRRF total não pode ser rateado com segurança.",
  };
}

function withMoneyLimitErrors<T extends {
  kind: "OPERATIONS" | "INCOMES";
  errors: string[];
  unitPriceCents?: number;
  feesCents?: number;
  amountCents?: number;
  unitValueCents?: number;
  netAmountCents?: number;
  brokerageNote?: {
    grossAmountCents: number;
    allocatedFeesCents: number;
    irrfCents: number;
  };
}>(item: T): T {
  const values =
    item.kind === "OPERATIONS"
      ? [
          item.unitPriceCents ?? 0,
          item.feesCents ?? 0,
          item.amountCents ?? 0,
          item.brokerageNote?.grossAmountCents ?? 0,
          item.brokerageNote?.allocatedFeesCents ?? 0,
          item.brokerageNote?.irrfCents ?? 0,
        ]
      : [item.unitValueCents ?? 0, item.netAmountCents ?? 0];
  if (values.some((value) => value > MAX_CENTS)) {
    return {
      ...item,
      errors: [
        ...item.errors,
        "Valor monetário excede o limite suportado pelo banco.",
      ],
    };
  }
  return item;
}


async function parsedItemsFromFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (extension === "pdf") {
    return parseNubankBrokerageNotePdf(bytes).items;
  }
  if (extension === "xlsx") {
    return parseInvestmentRows(parseXlsxRows(bytes), "XLSX");
  }
  if (extension === "csv") {
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ImportParseError("CSV deve usar codificação UTF-8 válida.");
    }
    return parseInvestmentRows(parseInvestmentCsvRows(content), "CSV");
  }

  throw new ImportParseError("Formato não suportado. Envie um arquivo .csv, .xlsx ou uma nota de corretagem .pdf.");
}

export async function previewInvestmentImport(request: Request) {
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
    const accountId = formData.get("accountId");
    const file = formData.get("file");

    if (typeof accountId !== "string" || !accountId) {
      return failure("Selecione uma conta de investimento", 400);
    }
    if (!(file instanceof File)) return failure("Selecione um arquivo CSV, XLSX ou PDF", 400);
    if (file.size === 0) return failure("O arquivo está vazio", 400);
    if (file.size > IMPORT_MAX_FILE_BYTES) return failure("Arquivo excede o limite de 2 MB", 413);

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true, type: "INVESTMENT" },
      select: { id: true, currency: true },
    });
    if (!account) return failure("Conta de investimento inválida ou inativa", 400);
    if (account.currency !== "BRL") {
      return failure("Este importador da B3 suporta somente contas em BRL", 400);
    }

    const parsed = (await parsedItemsFromFile(file)).map(withMoneyLimitErrors);
    const fingerprinted = withInvestmentImportFingerprints({ userId, accountId, items: parsed });
    const fingerprints = fingerprinted
      .filter((item) => item.errors.length === 0)
      .map((item) => item.fingerprint);

    const [operations, incomes, assets] = await Promise.all([
      fingerprints.length
        ? prisma.investmentOperation.findMany({
            where: { userId, importFingerprint: { in: fingerprints } },
            select: { importFingerprint: true },
          })
        : [],
      fingerprints.length
        ? prisma.investmentIncome.findMany({
            where: { userId, importFingerprint: { in: fingerprints } },
            select: { importFingerprint: true },
          })
        : [],
      prisma.investmentAsset.findMany({
        where: {
          userId,
          currency: "BRL",
          symbol: { in: [...new Set(fingerprinted.map((item) => item.symbol))] },
        },
        select: { symbol: true },
      }),
    ]);

    const existingFingerprints = new Set(
      [...operations, ...incomes].flatMap((item) =>
        item.importFingerprint ? [item.importFingerprint] : [],
      ),
    );
    const existingSymbols = new Set(assets.map((asset) => asset.symbol));
    const items = fingerprinted.map((item) => ({
      ...item,
      duplicate: item.errors.length === 0 && existingFingerprints.has(item.fingerprint),
      assetExists: existingSymbols.has(item.symbol),
    }));
    const tokenItems = items.map(({ assetExists, ...item }) => {
      void assetExists;
      return item;
    });
    const previewToken = signInvestmentImportPreview({
      userId,
      accountId,
      items: tokenItems,
    });

    return success({
      accountId,
      fileName: file.name,
      kind: items[0]?.kind ?? null,
      detectedSource: items.some((item) => item.kind === "OPERATIONS" && item.brokerageNote)
        ? "NUBANK_BROKERAGE_NOTE"
        : "B3",
      brokerageNotes: items
        .filter((item) => item.kind === "OPERATIONS" && item.brokerageNote)
        .reduce<Array<{
          identity: string;
          noteNumber: string;
          tradeDate: string;
          broker: string;
          brokerCnpj: string | null;
          businesses: number;
          feesCents: number;
          irrfCents: number;
        }>>((notes, item) => {
          if (item.kind !== "OPERATIONS" || !item.brokerageNote) return notes;
          const identity = brokerageNoteIdentity(item)!;
          let note = notes.find((entry) => entry.identity === identity);
          if (!note) {
            note = {
              identity,
              noteNumber: item.brokerageNote.noteNumber,
              tradeDate: item.brokerageNote.tradeDate,
              broker: item.brokerageNote.broker,
              brokerCnpj: item.brokerageNote.brokerCnpj,
              businesses: 0,
              feesCents: 0,
              irrfCents: item.brokerageNote.irrfCents,
            };
            notes.push(note);
          }
          note.businesses += 1;
          note.feesCents += item.brokerageNote.allocatedFeesCents;
          return notes;
        }, [])
        .map((note) => ({
          noteNumber: note.noteNumber,
          tradeDate: note.tradeDate,
          broker: note.broker,
          brokerCnpj: note.brokerCnpj,
          businesses: note.businesses,
          feesCents: note.feesCents,
          irrfCents: note.irrfCents,
          ...brokerageTaxDisposition(items, note.identity),
        })),
      previewToken,
      summary: {
        total: items.length,
        valid: items.filter((item) => item.errors.length === 0 && !item.duplicate).length,
        invalid: items.filter((item) => item.errors.length > 0).length,
        duplicates: items.filter((item) => item.duplicate).length,
        newAssets: new Set(items.filter((item) => !item.assetExists).map((item) => item.symbol)).size,
      },
      items,
    });
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ImportParseError) return failure(error.message, 400);
    return failure("Não foi possível analisar o arquivo de investimentos", 500);
  }
}

export async function confirmInvestmentImport(request: Request) {
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
    const tokenItems = input.items.map(({ selected, ...item }) => {
      void selected;
      return item;
    });
    verifyInvestmentImportPreview({
      token: input.previewToken,
      userId,
      accountId: input.accountId,
      items: tokenItems,
    });

    const selected = input.items.filter((item) => item.selected && !item.duplicate);
    if (selected.length === 0) return failure("Selecione ao menos um registro novo", 400);
    if (selected.some((item) => item.errors.length > 0)) {
      return failure("Há registros inválidos selecionados", 400);
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const account = await tx.account.findFirst({
          where: { id: input.accountId, userId, isActive: true, type: "INVESTMENT" },
          select: { id: true, name: true, currency: true },
        });
        if (!account) throw new Error("INVALID_ACCOUNT");
        if (account.currency !== "BRL") throw new Error("INVALID_CURRENCY");

        const symbols = [...new Set(selected.map((item) => item.symbol))];
        for (const symbol of symbols) {
          const sample = selected.find((item) => item.symbol === symbol)!;
          await tx.investmentAsset.upsert({
            where: {
              userId_symbol_currency: {
                userId,
                symbol,
                currency: "BRL",
              },
            },
            create: {
              userId,
              symbol,
              name: sample.assetName,
              type: sample.assetType,
              currency: "BRL",
              market: "B3",
            },
            update: {},
          });
        }

        const assets = await tx.investmentAsset.findMany({
          where: { userId, currency: "BRL", symbol: { in: symbols } },
          select: { id: true, symbol: true, name: true, type: true, currency: true },
        });
        const assetBySymbol = new Map(assets.map((asset) => [asset.symbol, asset]));

        const operationItems = selected.filter(
          (item): item is Extract<(typeof selected)[number], { kind: "OPERATIONS" }> =>
            item.kind === "OPERATIONS",
        );
        const sequenceByFingerprint = new Map<string, number>();

        if (operationItems.length > 0) {
          const assetIds = [...new Set(operationItems.map((item) => assetBySymbol.get(item.symbol)!.id))];
          const existing = await tx.investmentOperation.findMany({
            where: {
              userId,
              accountId: account.id,
              assetId: { in: assetIds },
            },
            include: {
              asset: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
              account: {
                select: { id: true, name: true, currency: true },
              },
            },
          });

          const existingImportFingerprints = new Set(
            existing.flatMap((operation) =>
              operation.importFingerprint ? [operation.importFingerprint] : [],
            ),
          );
          const candidateOperationItems = operationItems.filter(
            (item) => !existingImportFingerprints.has(item.fingerprint),
          );

          const nextSequenceByAssetDate = new Map<string, number>();
          for (const operation of existing) {
            const key = [
              operation.assetId,
              operation.year,
              operation.month,
              operation.day,
            ].join("|");
            nextSequenceByAssetDate.set(
              key,
              Math.max(
                nextSequenceByAssetDate.get(key) ?? -1,
                operation.sequence ?? -1,
              ),
            );
          }

          for (const item of [...candidateOperationItems].sort((left, right) => {
            const date = left.date.localeCompare(right.date);
            if (date !== 0) return date;
            const symbol = left.symbol.localeCompare(right.symbol);
            if (symbol !== 0) return symbol;
            const leftNote = left.brokerageNote?.noteNumber ?? "";
            const rightNote = right.brokerageNote?.noteNumber ?? "";
            const note = leftNote.localeCompare(rightNote, "pt-BR", {
              numeric: true,
            });
            if (note !== 0) return note;
            const business =
              (left.brokerageNote?.businessIndex ?? left.index) -
              (right.brokerageNote?.businessIndex ?? right.index);
            return business !== 0 ? business : left.index - right.index;
          })) {
            const asset = assetBySymbol.get(item.symbol)!;
            const parts = dateParts(item.date);
            const key = [
              asset.id,
              parts.year,
              parts.month,
              parts.day,
            ].join("|");
            const sequence = (nextSequenceByAssetDate.get(key) ?? -1) + 1;
            nextSequenceByAssetDate.set(key, sequence);
            sequenceByFingerprint.set(item.fingerprint, sequence);
          }

          const candidates: InvestmentOperationForPosition[] =
            candidateOperationItems.map((item) => {
              const asset = assetBySymbol.get(item.symbol)!;
              const quantityUnits = parseInvestmentQuantity(item.quantity);
              if (quantityUnits === null) throw new Error("INVALID_QUANTITY");
              return {
                id: `~import-${item.index}`,
                type: item.operationType,
                quantityUnits,
                unitPriceCents: item.unitPriceCents,
                feesCents: item.feesCents,
                ...dateParts(item.date),
                sequence: sequenceByFingerprint.get(item.fingerprint) ?? null,
                createdAt: new Date(0),
                accountId: account.id,
                accountName: account.name,
                assetId: asset.id,
                assetSymbol: asset.symbol,
                assetName: asset.name,
                assetType: asset.type,
                currency: asset.currency,
              };
            });

          const current: InvestmentOperationForPosition[] = existing.map((operation) => ({
            id: operation.id,
            type: operation.type,
            quantityUnits: operation.quantityUnits,
            unitPriceCents: operation.unitPriceCents,
            feesCents: operation.feesCents,
            year: operation.year,
            month: operation.month,
            day: operation.day,
            sequence: operation.sequence,
            createdAt: operation.createdAt,
            accountId: operation.account.id,
            accountName: operation.account.name,
            assetId: operation.asset.id,
            assetSymbol: operation.asset.symbol,
            assetName: operation.asset.name,
            assetType: operation.asset.type,
            currency: operation.asset.currency,
          }));

          deriveInvestmentPositions([...current, ...candidates]);
        }

        const existingFingerprints = selected.map((item) => item.fingerprint);
        const [existingOperations, existingIncomes] = await Promise.all([
          tx.investmentOperation.findMany({
            where: { userId, importFingerprint: { in: existingFingerprints } },
            select: { importFingerprint: true },
          }),
          tx.investmentIncome.findMany({
            where: { userId, importFingerprint: { in: existingFingerprints } },
            select: { importFingerprint: true },
          }),
        ]);
        const alreadyImported = new Set(
          [...existingOperations, ...existingIncomes].flatMap((item) =>
            item.importFingerprint ? [item.importFingerprint] : [],
          ),
        );
        const newItems = selected.filter((item) => !alreadyImported.has(item.fingerprint));
        const newOperations = newItems.filter(
          (item): item is Extract<(typeof newItems)[number], { kind: "OPERATIONS" }> =>
            item.kind === "OPERATIONS",
        );
        const newIncomes = newItems.filter(
          (item): item is Extract<(typeof newItems)[number], { kind: "INCOMES" }> =>
            item.kind === "INCOMES",
        );
        let importedWithholdings = 0;
        let taxReviews = 0;

        if (newOperations.length > 0) {
          await tx.investmentOperation.createMany({
            data: newOperations.map((item) => {
              const asset = assetBySymbol.get(item.symbol)!;
              const quantityUnits = parseInvestmentQuantity(item.quantity);
              if (quantityUnits === null) throw new Error("INVALID_QUANTITY");
              return {
                userId,
                accountId: account.id,
                assetId: asset.id,
                type: item.operationType,
                quantityUnits,
                unitPriceCents: item.unitPriceCents,
                feesCents: item.feesCents,
                ...dateParts(item.date),
                note: noteForItem(item),
                importSource: item.source === "PDF" ? null : item.source,
                importFingerprint: item.fingerprint,
                sequence: sequenceByFingerprint.get(item.fingerprint) ?? null,
              };
            }),
            skipDuplicates: true,
          });

          const importedOperations = await tx.investmentOperation.findMany({
            where: {
              userId,
              importFingerprint: {
                in: newOperations.map((item) => item.fingerprint),
              },
            },
            select: {
              id: true,
              type: true,
              quantityUnits: true,
              year: true,
              month: true,
              day: true,
              sequence: true,
              accountId: true,
              assetId: true,
            },
          });

          await tx.investmentFiscalEvent.createMany({
            data: importedOperations.map((operation) => ({
              id: operation.id,
              userId,
              accountId: operation.accountId,
              assetId: operation.assetId,
              operationId: operation.id,
              type: operation.type,
              originalType: operation.type,
              classificationSource: "SYSTEM",
              quantityUnits: operation.quantityUnits,
              year: operation.year,
              month: operation.month,
              day: operation.day,
              sequence: operation.sequence,
            })),
            skipDuplicates: true,
          });
        }

        const brokerageGroups = new Map<
          string,
          Array<Extract<(typeof input.items)[number], { kind: "OPERATIONS" }>>
        >();
        for (const item of input.items) {
          if (
            item.kind !== "OPERATIONS" ||
            !item.brokerageNote ||
            item.brokerageNote.irrfCents <= 0
          ) {
            continue;
          }
          const identity = brokerageNoteIdentity(item)!;
          const group = brokerageGroups.get(identity) ?? [];
          group.push(item);
          brokerageGroups.set(identity, group);
        }

        for (const noteItems of brokerageGroups.values()) {
          const sample = noteItems[0]!;
          const note = sample.brokerageNote!;
          const importFingerprint = brokerageTaxFingerprint(
            userId,
            account.id,
            sample,
          );
          const existingWithholding =
            await tx.investmentTaxWithholding.findUnique({
              where: {
                userId_importFingerprint: {
                  userId,
                  importFingerprint,
                },
              },
            });
          if (existingWithholding) {
            continue;
          }

          const noteOperations = await tx.investmentOperation.findMany({
            where: {
              userId,
              importFingerprint: {
                in: noteItems.map((item) => item.fingerprint),
              },
            },
            select: { id: true, assetId: true },
          });
          const uniqueAssetTypes = [
            ...new Set(noteItems.map((item) => item.assetType)),
          ];
          const completeNote =
            noteItems.every(
              (item) =>
                item.errors.length === 0 &&
                (item.duplicate || item.selected),
            ) && noteOperations.length === noteItems.length;
          const deterministic = completeNote && uniqueAssetTypes.length === 1;
          const reference = [
            note.brokerCnpj ?? note.broker,
            `nota ${note.noteNumber}`,
            note.tradeDate,
          ].join(" · ");
          const { year, month, day } = dateParts(note.tradeDate);

          if (deterministic) {
            const assetIds = [...new Set(noteOperations.map((item) => item.assetId))];
            const created = await tx.investmentTaxWithholding.create({
              data: {
                userId,
                assetType: uniqueAssetTypes[0]!,
                currency: "BRL",
                amountCents: note.irrfCents,
                year,
                month,
                day,
                source: "IMPORT",
                assetId: assetIds.length === 1 ? assetIds[0]! : null,
                operationId:
                  noteOperations.length === 1 ? noteOperations[0]!.id : null,
                importFingerprint,
                note: `IRRF importado de ${reference}`.slice(0, 500),
              },
            });
            importedWithholdings += 1;

            const review = await tx.investmentBrokerageTaxReview.findUnique({
              where: {
                userId_importFingerprint: { userId, importFingerprint },
              },
            });
            if (review && review.status === "PENDING") {
              await tx.investmentBrokerageTaxReview.update({
                where: { id: review.id },
                data: {
                  status: "RESOLVED",
                  resolvedAt: new Date(),
                  resolvedWithholdingId: created.id,
                },
              });
            }
          } else {
            const reason = !completeNote
              ? "A nota não foi importada integralmente; o IRRF total exige revisão antes do registro."
              : "A nota contém múltiplas classes de ativos; o IRRF total exige classificação manual e não será rateado automaticamente.";
            const existingReview =
              await tx.investmentBrokerageTaxReview.findUnique({
                where: {
                  userId_importFingerprint: { userId, importFingerprint },
                },
              });
            if (!existingReview) {
              await tx.investmentBrokerageTaxReview.create({
                data: {
                  userId,
                  importFingerprint,
                  noteNumber: note.noteNumber,
                  sourceInstitution: note.broker,
                  sourceReference: reference,
                  amountCents: note.irrfCents,
                  year,
                  month,
                  day,
                  reason,
                },
              });
              taxReviews += 1;
            }
          }
        }

        if (newIncomes.length > 0) {
          await tx.investmentIncome.createMany({
            data: newIncomes.map((item) => {
              const asset = assetBySymbol.get(item.symbol)!;
              const quantityUnits = parseInvestmentQuantity(item.quantity);
              if (quantityUnits === null) throw new Error("INVALID_QUANTITY");
              return {
                userId,
                accountId: account.id,
                assetId: asset.id,
                type: item.incomeType,
                quantityUnits,
                unitValueCents: item.unitValueCents,
                netAmountCents: item.netAmountCents,
                ...dateParts(item.date),
                note: noteForItem(item),
                importSource: item.source === "PDF" ? null : item.source,
                importFingerprint: item.fingerprint,
              };
            }),
            skipDuplicates: true,
          });
        }

        return {
          selected: selected.length,
          created: newItems.length,
          operations: newOperations.length,
          incomes: newIncomes.length,
          importedWithholdings,
          taxReviews,
          duplicates: selected.length - newItems.length,
          assets: assets.length,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return success(result, "Investimentos importados com sucesso", 201);
  } catch (error) {
    const auth = unauthorized(error);
    if (auth) return auth;
    if (error instanceof ZodError) return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    if (error instanceof Error) {
      if (error.message === "INVALID_PREVIEW_TOKEN") {
        return failure("Preview expirado ou inválido. Gere um novo preview", 400);
      }
      if (error.message === "INVALID_ACCOUNT") {
        return failure("Conta de investimento inválida ou inativa", 400);
      }
      if (error.message === "INVALID_CURRENCY") {
        return failure("Este importador da B3 suporta somente contas em BRL", 400);
      }
      if (error.message === "INVALID_QUANTITY") {
        return failure("Quantidade inválida no arquivo", 400);
      }
    }
    return failure("Não foi possível concluir a importação de investimentos", 500);
  }
}
