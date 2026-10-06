import { z } from "zod";

import { parseIsoLogicalDate } from "@/app/lib/date/logical-date";

export const MAX_DEBT_CENTS = 2_147_483_647;

const currencySchema = z.enum(["BRL", "USD", "EUR"]);
const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

const isoDateSchema = z
  .string()
  .refine((value) => parseIsoLogicalDate(value) !== null, "Data inválida");

const nullableIsoDateSchema = z.union([isoDateSchema, z.null()]).optional();

const positiveCentsSchema = z
  .number()
  .int("O valor deve usar centavos inteiros")
  .positive("O valor deve ser maior que zero")
  .max(MAX_DEBT_CENTS, "O valor excede o limite suportado");

export const createDebtSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da dívida").max(100),
  currency: currencySchema,
  balance: positiveCentsSchema,
  installmentAmount: positiveCentsSchema.nullable().optional(),
  dueDate: nullableIsoDateSchema,
  remainingInstallments: z.number().int().min(1).max(1200).nullable().optional(),
  institution: optionalText(120),
  description: optionalText(500),
});

export const updateDebtSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  installmentAmount: positiveCentsSchema.nullable().optional(),
  dueDate: nullableIsoDateSchema,
  remainingInstallments: z.number().int().min(1).max(1200).nullable().optional(),
  institution: optionalText(120),
  description: optionalText(500),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const adjustDebtSchema = z.object({
  newBalance: z
    .number()
    .int("O saldo deve usar centavos inteiros")
    .min(0, "O saldo não pode ser negativo")
    .max(MAX_DEBT_CENTS, "O saldo excede o limite suportado"),
  description: optionalText(255),
  effectiveDate: isoDateSchema.optional(),
});

export const recordDebtPaymentSchema = z.object({
  amount: positiveCentsSchema,
  description: optionalText(255),
  effectiveDate: isoDateSchema.optional(),
  transactionId: z.string().uuid("Transação inválida").nullable().optional(),
});

export type RecordDebtPaymentInput = z.infer<typeof recordDebtPaymentSchema>;
