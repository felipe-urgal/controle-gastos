type ExportAccount = {
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

type ExportCategory = {
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

type ExportTransaction = {
  id: string;
  amount: number;
  year: number;
  month: number;
  day: number;
  type: string;
  status: string;
  description: string;
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
  };
};

export type UserDataExportInput = {
  exportedAt: Date;
  accounts: ExportAccount[];
  categories: ExportCategory[];
  transactions: ExportTransaction[];
};

const CSV_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

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

export function serializeTransactionsCsv(transactions: ExportTransaction[]) {
  const headers = [
    "transactionId",
    "date",
    "amountCents",
    "currency",
    "type",
    "status",
    "accountId",
    "accountName",
    "categoryId",
    "categoryName",
    "description",
  ];

  const rows = transactions.map((transaction) => [
    transaction.id,
    formatExportDate(transaction.year, transaction.month, transaction.day),
    transaction.amount,
    transaction.account.currency,
    transaction.type,
    transaction.status,
    transaction.account.id,
    transaction.account.name,
    transaction.category.id,
    transaction.category.name,
    transaction.description,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvField(value)).join(","))
    .join("\r\n");
}

export function buildUserDataSnapshot(input: UserDataExportInput) {
  return {
    formatVersion: 1,
    exportedAt: input.exportedAt.toISOString(),
    accounts: input.accounts.map((account) => ({
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
    })),
    categories: input.categories.map((category) => ({
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
    })),
    transactions: input.transactions.map((transaction) => ({
      id: transaction.id,
      date: formatExportDate(transaction.year, transaction.month, transaction.day),
      amountCents: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      account: transaction.account,
      category: transaction.category,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    })),
  };
}
