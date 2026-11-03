import { z } from "zod";

export const BACKUP_FORMAT = "controle-gastos-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 25 * 1024 * 1024;
export const BACKUP_MAX_TRANSACTIONS = 50_000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const backupAccount = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["CREDIT_DEBIT", "INVESTMENT", "CREDIT_CARD"]),
  currency: z.string().length(3),
  isActive: z.boolean(),
  color: hex.nullable(),
  icon: z.string().max(30).nullable(),
  description: z.string().max(500).nullable(),
  creditLimit: z.number().int().nullable(),
  statementClosingDay: z.number().int().min(1).max(31).nullable(),
  statementDueDay: z.number().int().min(1).max(31).nullable(),
});

const categoryRef = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["INCOME", "EXPENSE"]),
});

const backupCategory = categoryRef.extend({
  color: hex,
  icon: z.string().max(30),
  isActive: z.boolean(),
  description: z.string().max(200).nullable(),
});

const backupTransaction = z.object({
  /** Id original; vira `importExternalId` e garante a idempotência. */
  ref: z.string().min(1).max(64),
  amount: z.number().int(),
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  type: z.enum(["INCOME", "EXPENSE"]),
  kind: z.enum(["NORMAL", "TRANSFER", "CARD_PAYMENT", "OPENING_BALANCE"]),
  description: z.string().max(255),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]),
  reconciliationStatus: z.enum(["UNCLEARED", "CLEARED", "RECONCILED"]),
  reconciledAt: z.string().nullable(),
  account: z.string().min(1).max(100),
  category: categoryRef.nullable(),
  merchant: z.string().max(120).nullable(),
  tags: z.array(z.string().max(40)).max(50),
  allocations: z.array(z.object({ category: categoryRef, amount: z.number().int() })).max(50),
  transferRef: z.string().max(64).nullable(),
  transferRole: z.enum(["SOURCE", "DESTINATION"]).nullable(),
});

const backupCardPayment = z.object({
  amount: z.number().int(),
  closingYear: z.number().int(),
  closingMonth: z.number().int(),
  closingDay: z.number().int(),
  cardAccount: z.string().min(1).max(100),
  sourceAccount: z.string().min(1).max(100),
  /** `ref` da transação CARD_PAYMENT que representa a saída na conta. */
  sourceTransactionRef: z.string().min(1).max(64),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  period: z.object({ from: isoDate, to: isoDate }),
  accounts: z.array(backupAccount).max(500),
  categories: z.array(backupCategory).max(2000),
  merchants: z.array(z.string().min(1).max(120)).max(20_000),
  tags: z.array(z.string().min(1).max(40)).max(5000),
  transactions: z.array(backupTransaction).max(BACKUP_MAX_TRANSACTIONS),
  cardPayments: z.array(backupCardPayment).max(5000),
});

export type Backup = z.infer<typeof backupSchema>;
export type BackupTransaction = z.infer<typeof backupTransaction>;
export type BackupAccount = z.infer<typeof backupAccount>;
export type BackupCategory = z.infer<typeof backupCategory>;
