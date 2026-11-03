import { failure } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { escapeCsvField, formatExportDate } from "@/app/lib/export/user-data-export";
import { prisma } from "@/app/lib/prisma";
import {
  BACKUP_FORMAT,
  BACKUP_MAX_TRANSACTIONS,
  BACKUP_VERSION,
  type Backup,
} from "@/app/lib/transactions/backup/backup-format";
import { createZip } from "@/app/lib/transactions/backup/zip";
import { periodRangeSchema, periodRangeWhere } from "@/app/lib/transactions/period-range";

const transactionSelect = {
  id: true,
  amount: true,
  year: true,
  month: true,
  day: true,
  type: true,
  kind: true,
  description: true,
  status: true,
  reconciliationStatus: true,
  reconciledAt: true,
  transferId: true,
  transferRole: true,
  account: true,
  category: true,
  merchant: { select: { name: true } },
  tagLinks: { select: { tag: { select: { name: true } } } },
  allocations: { select: { amount: true, category: { select: { name: true, type: true } } } },
} as const;

export async function buildBackup(userId: string, input: unknown): Promise<Backup> {
  const parsed = periodRangeSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues[0]?.message ?? "Período inválido", 400);
  }
  const range = parsed.data;

  return prisma.$transaction(async (tx) => {
    if (range.accountId) {
      const owned = await tx.account.findFirst({ where: { id: range.accountId, userId }, select: { id: true } });
      if (!owned) throw new HttpError("Conta não encontrada", 404);
    }

    const base = await tx.transaction.findMany({
      where: {
        userId,
        ...periodRangeWhere(range),
        ...(range.accountId ? { accountId: range.accountId } : {}),
      },
      select: { id: true, transferId: true },
      take: BACKUP_MAX_TRANSACTIONS + 1,
    });
    if (base.length > BACKUP_MAX_TRANSACTIONS) {
      throw new HttpError(
        `O período tem transações demais para um único backup (máximo ${BACKUP_MAX_TRANSACTIONS}). Divida em períodos menores.`,
        413,
      );
    }

    // Transferência é atômica: as duas pernas entram mesmo com filtro de conta.
    const transferIds = [...new Set(base.flatMap((row) => (row.transferId ? [row.transferId] : [])))];
    const legs = transferIds.length
      ? await tx.transaction.findMany({
          where: { userId, transferId: { in: transferIds } },
          select: { id: true },
        })
      : [];
    const ids = [...new Set([...base.map((row) => row.id), ...legs.map((row) => row.id)])];

    const rows = await tx.transaction.findMany({
      where: { userId, id: { in: ids } },
      select: transactionSelect,
      orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }, { createdAt: "asc" }],
    });

    const payments = await tx.creditCardPayment.findMany({
      where: { userId, sourceTransactionId: { in: rows.filter((row) => row.kind === "CARD_PAYMENT").map((row) => row.id) } },
      include: { cardAccount: { select: { name: true } }, sourceAccount: { select: { name: true } } },
    });

    const accountsByName = new Map(rows.map((row) => [row.account.name, row.account]));
    for (const payment of payments) {
      if (!accountsByName.has(payment.cardAccount.name)) {
        const card = await tx.account.findFirst({ where: { id: payment.cardAccountId, userId } });
        if (card) accountsByName.set(card.name, card);
      }
    }

    const categories = new Map<string, Backup["categories"][number]>();
    const addCategory = (category: { name: string; type: "INCOME" | "EXPENSE"; color: string; icon: string; isActive: boolean; description: string | null }) =>
      categories.set(`${category.type}:${category.name}`, {
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        description: category.description,
      });
    for (const row of rows) {
      if (row.category) addCategory(row.category);
    }
    const allocationRefs = rows.flatMap((row) => row.allocations.map((item) => item.category));
    if (allocationRefs.length > 0) {
      const full = await tx.category.findMany({
        where: { userId, OR: allocationRefs.map((ref) => ({ name: ref.name, type: ref.type })) },
      });
      full.forEach(addCategory);
    }

    const transactions = rows.map((row) => ({
      ref: row.id,
      amount: row.amount,
      year: row.year,
      month: row.month,
      day: row.day,
      type: row.type,
      kind: row.kind,
      description: row.description,
      status: row.status,
      reconciliationStatus: row.reconciliationStatus,
      reconciledAt: row.reconciledAt ? row.reconciledAt.toISOString() : null,
      account: row.account.name,
      category: row.category ? { name: row.category.name, type: row.category.type } : null,
      merchant: row.merchant?.name ?? null,
      tags: row.tagLinks.map((link) => link.tag.name),
      allocations: row.allocations.map((item) => ({ category: item.category, amount: item.amount })),
      transferRef: row.transferId,
      transferRole: row.transferRole,
    }));

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      period: { from: range.from, to: range.to },
      accounts: [...accountsByName.values()].map((account) => ({
        name: account.name,
        type: account.type,
        currency: account.currency,
        isActive: account.isActive,
        color: account.color,
        icon: account.icon,
        description: account.description,
        creditLimit: account.creditLimit,
        statementClosingDay: account.statementClosingDay,
        statementDueDay: account.statementDueDay,
      })),
      categories: [...categories.values()],
      merchants: [...new Set(rows.flatMap((row) => (row.merchant ? [row.merchant.name] : [])))],
      tags: [...new Set(rows.flatMap((row) => row.tagLinks.map((link) => link.tag.name)))],
      transactions,
      cardPayments: payments.map((payment) => ({
        amount: payment.amount,
        closingYear: payment.closingYear,
        closingMonth: payment.closingMonth,
        closingDay: payment.closingDay,
        cardAccount: payment.cardAccount.name,
        sourceAccount: payment.sourceAccount.name,
        sourceTransactionRef: payment.sourceTransactionId,
      })),
    };
  });
}

const BACKUP_CSV_HEADERS = [
  "ref",
  "date",
  "amountCents",
  "currency",
  "type",
  "kind",
  "status",
  "account",
  "category",
  "merchant",
  "tags",
  "allocations",
  "transferRef",
  "transferRole",
  "description",
] as const;

/** Planilha somente leitura: não é restaurável (use o JSON para isso). */
export function serializeBackupCsv(backup: Backup) {
  const currencyByAccount = new Map(backup.accounts.map((account) => [account.name, account.currency]));
  const rows = backup.transactions.map((transaction) =>
    [
      transaction.ref,
      formatExportDate(transaction.year, transaction.month, transaction.day),
      transaction.amount,
      currencyByAccount.get(transaction.account) ?? null,
      transaction.type,
      transaction.kind,
      transaction.status,
      transaction.account,
      transaction.category?.name ?? null,
      transaction.merchant,
      transaction.tags.map((tag) => "#" + tag).join(" "),
      transaction.allocations.map((item) => `${item.category.name}: ${item.amount}`).join("; "),
      transaction.transferRef,
      transaction.transferRole,
      transaction.description,
    ]
      .map((value) => escapeCsvField(value))
      .join(","),
  );
  return [BACKUP_CSV_HEADERS.map((value) => escapeCsvField(value)).join(","), ...rows].join("\r\n");
}

export async function exportBackup(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = new URL(request.url).searchParams;
    const backup = await buildBackup(userId, {
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      accountId: params.get("accountId") || undefined,
    });

    const fileName = `backup-transacoes-${backup.period.from}_a_${backup.period.to}`;

    // ZIP com o JSON (restaurável) e o CSV (planilha, somente leitura).
    const zip = createZip([
      { name: `${fileName}.json`, content: JSON.stringify(backup) },
      { name: `${fileName}.csv`, content: "\uFEFF" + serializeBackupCsv(backup) },
    ]);

    return new Response(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}.zip"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (isHttpError(error)) return failure(error.message, error.status, error.code);
    return failure("Erro ao exportar backup", 500);
  }
}
