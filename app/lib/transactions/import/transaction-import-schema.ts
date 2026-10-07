import { z } from "zod";

import { IMPORT_MAX_ITEMS } from "@/app/lib/transactions/import/parser";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";

const previewItemSchema = z.object({
  index: z.number().int().min(0),
  source: z.enum(["CSV", "OFX", "QIF", "XLSX"]),
  date: z.string(),
  amountCents: z.number().int().min(0).max(TRANSACTION_MAX_AMOUNT_CENTS),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(TRANSACTION_DESCRIPTION_MAX_LENGTH),
  externalId: z.string().max(191).optional(),
  currency: z.string().length(3).optional(),
  errors: z.array(z.string()),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  duplicate: z.boolean(),
});

export const confirmTransactionImportSchema = z.object({
  accountId: z.uuid("Conta inválida"),
  previewToken: z.string().min(1),
  items: z.array(
    previewItemSchema.extend({
      selected: z.boolean(),
      categoryId: z.uuid("Categoria inválida").nullable(),
      merchantId: z.uuid("Estabelecimento inválido").nullable().optional(),
      learnMerchantAlias: z.boolean().optional().default(false),
      merchantAliasOperator: z
        .enum(["EQUALS", "STARTS_WITH", "CONTAINS"])
        .optional()
        .default("EQUALS"),
    }),
  ).min(1).max(IMPORT_MAX_ITEMS),
});

export type ConfirmTransactionImportInput = z.infer<typeof confirmTransactionImportSchema>;
