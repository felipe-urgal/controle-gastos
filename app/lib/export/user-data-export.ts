export type ExportAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExportCategory = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  color: string;
  icon: string;
  description: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ExportTransaction = {
  id: string;
  amount: number;
  year: number;
  month: number;
  day: number;
  type: string;
  kind: string;
  status: string;
  description: string;
  transferId: string | null;
  transferRole: string | null;
  createdAt: Date;
  updatedAt: Date;
  account: {
    id: string;
    name: string;
    currency: string;
  };
  category: {
    id: string;
    name: string;
    type: string;
  } | null;
};

export type UserDataExportInput = {
  exportedAt: Date;
  accounts: ExportAccount[];
  categories: ExportCategory[];
  transactions: ExportTransaction[];
};

export const CSV_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

export function formatExportDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function sanitizeSpreadsheetText(value: string) {
  return CSV_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function escapeCsvField(value: string | number | boolean | null) {
  const raw = value === null ? "" : String(value);
  const safe = typeof value === "string" ? sanitizeSpreadsheetText(raw) : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export const TRANSACTION_CSV_HEADERS = [
  "transactionId",
  "date",
  "amountCents",
  "currency",
  "type",
  "kind",
  "status",
  "accountId",
  "accountName",
  "categoryId",
  "categoryName",
  "transferId",
  "transferRole",
  "description",
] as const;

export function serializeTransactionCsvRow(transaction: ExportTransaction) {
  return [
    transaction.id,
    formatExportDate(transaction.year, transaction.month, transaction.day),
    transaction.amount,
    transaction.account.currency,
    transaction.type,
    transaction.kind,
    transaction.status,
    transaction.account.id,
    transaction.account.name,
    transaction.category?.id ?? null,
    transaction.category?.name ?? null,
    transaction.transferId,
    transaction.transferRole,
    transaction.description,
  ]
    .map((value) => escapeCsvField(value))
    .join(",");
}

export function serializeTransactionsCsv(transactions: ExportTransaction[]) {
  return [
    TRANSACTION_CSV_HEADERS.map((value) => escapeCsvField(value)).join(","),
    ...transactions.map(serializeTransactionCsvRow),
  ].join("\r\n");
}

export function serializeExportAccount(account: ExportAccount) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    isActive: account.isActive,
    color: account.color,
    icon: account.icon,
    description: account.description,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function serializeExportCategory(category: ExportCategory) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    isActive: category.isActive,
    color: category.color,
    icon: category.icon,
    description: category.description,
    position: category.position,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function serializeExportTransaction(transaction: ExportTransaction) {
  return {
    id: transaction.id,
    date: formatExportDate(transaction.year, transaction.month, transaction.day),
    amountCents: transaction.amount,
    type: transaction.type,
    kind: transaction.kind,
    status: transaction.status,
    description: transaction.description,
    account: transaction.account,
    category: transaction.category,
    transfer:
      transaction.kind === "TRANSFER"
        ? {
            id: transaction.transferId,
            role: transaction.transferRole,
          }
        : null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function buildUserDataSnapshot(input: UserDataExportInput) {
  return {
    formatVersion: 2,
    exportedAt: input.exportedAt.toISOString(),
    accounts: input.accounts.map(serializeExportAccount),
    categories: input.categories.map(serializeExportCategory),
    transactions: input.transactions.map(serializeExportTransaction),
  };
}
