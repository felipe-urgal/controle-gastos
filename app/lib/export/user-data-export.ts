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
  tags?: Array<{ id: string; name: string }>;
};

export const CSV_FORMULA_PREFIX = /^[\\t\\r\\n ]*[=+\\-@]/;

export function formatExportDate(year: number, month: number, day: number) {
  return [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

export function sanitizeSpreadsheetText(value: string) {
  return CSV_FORMULA_PREFIX.test(value) ? "'" + value : value;
}

export function escapeCsvField(value: string | number | boolean | null) {
  const raw = value === null ? "" : String(value);
  const safe = typeof value === "string" ? sanitizeSpreadsheetText(raw) : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
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
  "tags",
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
    (transaction.tags ?? []).map((tag) => "#" + tag.name).join(" "),
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
  ].join("\\r\\n");
}