import { z } from "zod";

import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_DESCRIPTION_MIN_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";

const templateDescriptionSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .min(
      TRANSACTION_DESCRIPTION_MIN_LENGTH,
      `Descrição deve ter pelo menos ${TRANSACTION_DESCRIPTION_MIN_LENGTH} caracteres`,
    )
    .max(
      TRANSACTION_DESCRIPTION_MAX_LENGTH,
      `Descrição não pode exceder ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres`,
    ),
]);

const templateAmountSchema = z
  .number()
  .int("Valor deve usar centavos inteiros")
  .positive("Valor deve ser maior que zero")
  .max(
    TRANSACTION_MAX_AMOUNT_CENTS,
    `Valor não pode exceder ${TRANSACTION_MAX_AMOUNT_CENTS.toLocaleString("pt-BR")}`,
  );

export const transactionTemplateCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: templateDescriptionSchema.default(""),
  amount: templateAmountSchema.nullable().optional(),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]).default("COMPLETED"),
  isFavorite: z.boolean().default(false),
  position: z.number().int().min(0).max(10_000).default(0),
  accountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const transactionTemplateUpdateSchema =
  transactionTemplateCreateSchema.partial();
