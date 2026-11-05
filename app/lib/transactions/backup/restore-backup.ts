import { createHash, randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { normalizeTagDisplayName, normalizeTagNameKey } from "@/app/lib/tags/tag-name";
import {
  BACKUP_MAX_BYTES,
  backupSchema,
  type Backup,
  type BackupTransaction,
} from "@/app/lib/transactions/backup/backup-format";

export type RestoreSummary = {
  period: { from: string; to: string };
  transactions: { toRestore: number; alreadyPresent: number };
  transfers: { toRestore: number; alreadyPresent: number };
  cardPayments: { toRestore: number; alreadyPresent: number };
  /** Saldo inicial de conta que já existe não é recriado. */
  openingBalanceSkipped: number;
  willCreate: {
    accounts: string[];
    categories: string[];
    merchants: number;
    tags: number;
  };
  /** Conta com o mesmo nome mas outra moeda/tipo: criada com sufixo para não misturar moedas. */
  renamedAccounts: Array<{ from: string; to: string }>;
  /** Itens do arquivo que não podem ser restaurados (são ignorados, o resto segue). */
  problems: string[];
};

const MAX_PROBLEMS = 50;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const categoryKey = (ref: { type: string; name: string }) => `${ref.type}:${ref.name}`;

type Db = Prisma.TransactionClient;

async function runRestore(
  tx: Db,
  userId: string,
  backup: Backup,
  options: { dryRun: boolean },
): Promise<RestoreSummary> {
  const { dryRun } = options;
  const problems: string[] = [];
  const problem = (message: string) => {
    if (problems.length < MAX_PROBLEMS) problems.push(message);
  };

  // ---- Contas -------------------------------------------------------------
  const existingAccounts = await tx.account.findMany({ where: { userId } });
  const takenNames = new Set(existingAccounts.map((account) => account.name));
  const accountIds = new Map<string, string>(); // nome no arquivo -> id
  const createdAccountNames = new Set<string>();
  const willCreateAccounts: string[] = [];
  const renamedAccounts: RestoreSummary["renamedAccounts"] = [];

  for (const definition of backup.accounts) {
    const same = existingAccounts.find((account) => account.name === definition.name);
    if (same && same.currency === definition.currency && same.type === definition.type) {
      accountIds.set(definition.name, same.id);
      continue;
    }

    let name = definition.name;
    if (same) {
      let suffix = " (restaurada)";
      let counter = 1;
      name = `${definition.name}${suffix}`.slice(0, 100);
      while (takenNames.has(name)) {
        counter += 1;
        suffix = ` (restaurada ${counter})`;
        name = `${definition.name.slice(0, 100 - suffix.length)}${suffix}`;
      }
      renamedAccounts.push({ from: definition.name, to: name });
    }
    takenNames.add(name);

    const id = randomUUID();
    accountIds.set(definition.name, id);
    createdAccountNames.add(definition.name);
    willCreateAccounts.push(name);
    if (!dryRun) {
      await tx.account.create({
        data: {
          id,
          userId,
          name,
          type: definition.type,
          currency: definition.currency,
          isActive: definition.isActive,
          color: definition.color,
          icon: definition.icon,
          description: definition.description,
          creditLimit: definition.creditLimit,
          statementClosingDay: definition.statementClosingDay,
          statementDueDay: definition.statementDueDay,
        },
      });
    }
  }

  // ---- Categorias ---------------------------------------------------------
  const existingCategories = await tx.category.findMany({ where: { userId }, select: { id: true, name: true, type: true, position: true } });
  const categoryIds = new Map(existingCategories.map((category) => [categoryKey(category), category.id]));
  const willCreateCategories: string[] = [];
  let nextPosition = existingCategories.reduce((max, category) => Math.max(max, category.position), -1) + 1;

  const categoryDefinitions = new Map(backup.categories.map((category) => [categoryKey(category), category]));
  const referencedCategories = new Set<string>();
  for (const transaction of backup.transactions) {
    if (transaction.category) referencedCategories.add(categoryKey(transaction.category));
    for (const allocation of transaction.allocations) referencedCategories.add(categoryKey(allocation.category));
  }
  for (const key of referencedCategories) {
    if (categoryIds.has(key)) continue;
    const [type, ...rest] = key.split(":");
    const name = rest.join(":");
    const definition = categoryDefinitions.get(key);
    const id = randomUUID();
    categoryIds.set(key, id);
    willCreateCategories.push(name);
    if (!dryRun) {
      await tx.category.create({
        data: {
          id,
          userId,
          name,
          type: type as "INCOME" | "EXPENSE",
          color: definition?.color ?? "#3B82F6",
          icon: definition?.icon ?? "tag",
          isActive: definition?.isActive ?? true,
          description: definition?.description ?? null,
          position: nextPosition++,
        },
      });
    }
  }

  // ---- Estabelecimentos e tags -------------------------------------------
  const existingMerchants = await tx.merchant.findMany({ where: { userId }, select: { id: true, name: true } });
  const merchantIds = new Map(existingMerchants.map((merchant) => [merchant.name.trim().toLowerCase(), merchant.id]));
  let merchantsToCreate = 0;
  for (const name of new Set(backup.transactions.flatMap((t) => (t.merchant ? [t.merchant] : [])))) {
    const key = name.trim().toLowerCase();
    if (merchantIds.has(key)) continue;
    const id = randomUUID();
    merchantIds.set(key, id);
    merchantsToCreate += 1;
    if (!dryRun) await tx.merchant.create({ data: { id, userId, name: name.trim() } });
  }

  const existingTags = await tx.tag.findMany({ where: { userId }, select: { id: true, normalizedName: true } });
  const tagIds = new Map(existingTags.map((tag) => [tag.normalizedName, tag.id]));
  let tagsToCreate = 0;
  for (const name of new Set(backup.transactions.flatMap((t) => t.tags))) {
    const key = normalizeTagNameKey(name);
    if (!key || tagIds.has(key)) continue;
    const id = randomUUID();
    tagIds.set(key, id);
    tagsToCreate += 1;
    if (!dryRun) {
      await tx.tag.create({ data: { id, userId, name: normalizeTagDisplayName(name), normalizedName: key } });
    }
  }

  // ---- Já restauradas (idempotência) -------------------------------------
  const present = new Set(
    (
      await tx.transaction.findMany({
        where: {
          userId,
          importSource: "BACKUP",
          importExternalId: { in: backup.transactions.map((t) => t.ref) },
        },
        select: { importExternalId: true },
      })
    ).flatMap((row) => (row.importExternalId ? [row.importExternalId] : [])),
  );

  const summary: RestoreSummary = {
    period: backup.period,
    transactions: { toRestore: 0, alreadyPresent: 0 },
    transfers: { toRestore: 0, alreadyPresent: 0 },
    cardPayments: { toRestore: 0, alreadyPresent: 0 },
    openingBalanceSkipped: 0,
    willCreate: { accounts: willCreateAccounts, categories: willCreateCategories, merchants: merchantsToCreate, tags: tagsToCreate },
    renamedAccounts,
    problems,
  };

  const transactionRows: Prisma.TransactionCreateManyInput[] = [];
  const allocationRows: Prisma.TransactionAllocationCreateManyInput[] = [];
  const tagRows: Prisma.TransactionTagCreateManyInput[] = [];
  const newTransferIds: string[] = [];

  const baseRow = (item: BackupTransaction): Prisma.TransactionCreateManyInput | null => {
    const accountId = accountIds.get(item.account);
    if (!accountId) {
      problem(`"${item.description}": conta "${item.account}" não está definida no arquivo`);
      return null;
    }
    const merchantId = item.merchant ? merchantIds.get(item.merchant.trim().toLowerCase()) ?? null : null;
    const id = randomUUID();
    for (const allocation of item.allocations) {
      allocationRows.push({
        userId,
        transactionId: id,
        categoryId: categoryIds.get(categoryKey(allocation.category)) as string,
        amount: allocation.amount,
      });
    }
    for (const tag of new Set(item.tags.map(normalizeTagNameKey))) {
      const tagId = tagIds.get(tag);
      if (tagId) tagRows.push({ userId, transactionId: id, tagId });
    }
    return {
      id,
      userId,
      accountId,
      categoryId: item.category ? (categoryIds.get(categoryKey(item.category)) as string) : null,
      merchantId,
      amount: item.amount,
      year: item.year,
      month: item.month,
      day: item.day,
      type: item.type,
      kind: item.kind,
      description: item.description,
      status: item.status,
      reconciliationStatus: item.reconciliationStatus,
      reconciledAt: item.reconciledAt ? new Date(item.reconciledAt) : null,
      importSource: "BACKUP",
      importExternalId: item.ref,
    };
  };

  // Normais e saldo inicial
  for (const item of backup.transactions) {
    if (item.kind === "NORMAL") {
      if (present.has(item.ref)) { summary.transactions.alreadyPresent += 1; continue; }
      if (!item.category) { problem(`"${item.description}": transação sem categoria`); continue; }
      const row = baseRow(item);
      if (row) { transactionRows.push(row); summary.transactions.toRestore += 1; }
    } else if (item.kind === "OPENING_BALANCE") {
      if (present.has(item.ref) || !createdAccountNames.has(item.account)) { summary.openingBalanceSkipped += 1; continue; }
      const row = baseRow(item);
      if (row) { transactionRows.push(row); summary.transactions.toRestore += 1; }
    }
  }

  // Transferências (pares)
  const legsByTransfer = new Map<string, BackupTransaction[]>();
  for (const item of backup.transactions) {
    if (item.kind !== "TRANSFER") continue;
    const key = item.transferRef ?? `solo:${item.ref}`;
    legsByTransfer.set(key, [...(legsByTransfer.get(key) ?? []), item]);
  }
  const transferRows: Prisma.TransferCreateManyInput[] = [];
  for (const legs of legsByTransfer.values()) {
    const source = legs.find((leg) => leg.transferRole === "SOURCE");
    const destination = legs.find((leg) => leg.transferRole === "DESTINATION");
    if (legs.length !== 2 || !source || !destination || source.account === destination.account) {
      problem(`Transferência "${legs[0].description}" incompleta no arquivo; ignorada`);
      continue;
    }
    if (legs.some((leg) => present.has(leg.ref))) { summary.transfers.alreadyPresent += 1; continue; }
    const sourceRow = baseRow(source);
    const destinationRow = baseRow(destination);
    if (!sourceRow || !destinationRow) continue;
    const transferId = randomUUID();
    newTransferIds.push(transferId);
    transferRows.push({ id: transferId, userId });
    transactionRows.push(
      { ...sourceRow, transferId, transferRole: "SOURCE" },
      { ...destinationRow, transferId, transferRole: "DESTINATION" },
    );
    summary.transfers.toRestore += 1;
  }

  // Pagamentos de fatura
  const paymentRows: Prisma.CreditCardPaymentCreateManyInput[] = [];
  const byRef = new Map(backup.transactions.map((item) => [item.ref, item]));
  for (const payment of backup.cardPayments) {
    const source = byRef.get(payment.sourceTransactionRef);
    const cardId = accountIds.get(payment.cardAccount);
    const sourceAccountId = accountIds.get(payment.sourceAccount);
    if (!source || source.kind !== "CARD_PAYMENT" || !cardId || !sourceAccountId) {
      problem(`Pagamento de fatura de "${payment.cardAccount}" incompleto no arquivo; ignorado`);
      continue;
    }
    const duplicate = await tx.creditCardPayment.findFirst({
      where: {
        userId,
        cardAccountId: cardId,
        closingYear: payment.closingYear,
        closingMonth: payment.closingMonth,
        closingDay: payment.closingDay,
      },
      select: { id: true },
    });
    if (present.has(source.ref) || duplicate) { summary.cardPayments.alreadyPresent += 1; continue; }
    const row = baseRow(source);
    if (!row) continue;
    transactionRows.push(row);
    paymentRows.push({
      userId,
      amount: payment.amount,
      closingYear: payment.closingYear,
      closingMonth: payment.closingMonth,
      closingDay: payment.closingDay,
      cardAccountId: cardId,
      sourceAccountId,
      sourceTransactionId: row.id as string,
      idempotencyKeyHash: sha256(`backup:${source.ref}`),
      requestHash: sha256(`backup:${source.ref}:${payment.amount}`),
    });
    summary.cardPayments.toRestore += 1;
  }

  await assertMonthsOpen(tx, userId, transactionRows as Array<{ year: number; month: number }>);

  if (!dryRun) {
    if (transferRows.length) await tx.transfer.createMany({ data: transferRows });
    if (transactionRows.length) await tx.transaction.createMany({ data: transactionRows });
    if (allocationRows.length) await tx.transactionAllocation.createMany({ data: allocationRows });
    if (tagRows.length) await tx.transactionTag.createMany({ data: tagRows, skipDuplicates: true });
    if (paymentRows.length) await tx.creditCardPayment.createMany({ data: paymentRows });
  }

  return summary;
}

async function readBackup(request: Request): Promise<Backup> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > BACKUP_MAX_BYTES) throw new HttpError("Arquivo de backup grande demais", 413);

  const text = await request.text();
  if (text.length > BACKUP_MAX_BYTES) throw new HttpError("Arquivo de backup grande demais", 413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError("O arquivo não é um JSON válido", 400);
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError("O arquivo não é um backup de transações válido ou tem versão incompatível", 400);
  }
  return parsed.data;
}

function handleError(error: unknown, fallback: string) {
  if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
  if (isHttpError(error)) return failure(error.message, error.status, error.code);
  return failure(fallback, 500);
}

export async function previewRestore(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const backup = await readBackup(request);
    const summary = await prisma.$transaction((tx) => runRestore(tx, userId, backup, { dryRun: true }), { timeout: 60_000 });
    return success(summary);
  } catch (error) {
    return handleError(error, "Erro ao analisar o backup");
  }
}

export async function restoreBackup(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações de transações em pouco tempo. Aguarde e tente novamente.",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }
    const backup = await readBackup(request);
    const summary = await prisma.$transaction((tx) => runRestore(tx, userId, backup, { dryRun: false }), {
      timeout: 120_000,
      maxWait: 10_000,
    });
    return success(summary, "Backup restaurado com sucesso");
  } catch (error) {
    return handleError(error, "Erro ao restaurar backup");
  }
}
