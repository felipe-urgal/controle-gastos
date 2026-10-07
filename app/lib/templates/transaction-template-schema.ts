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

const transactionTemplateBaseSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: templateDescriptionSchema,
  amount: templateAmountSchema.nullable().optional(),
  isFavorite: z.boolean(),
  accountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const transactionTemplateCreateSchema =
  transactionTemplateBaseSchema.extend({
    description: templateDescriptionSchema.default(""),
    isFavorite: z.boolean().default(false),
  });

export const transactionTemplateUpdateSchema = transactionTemplateBaseSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe pelo menos um campo para atualizar",
  );
