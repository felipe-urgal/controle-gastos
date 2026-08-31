import { z } from "zod";

const previewItemSchema = z.object({
  index: z.number().int().min(0),
  source: z.enum(["CSV", "OFX"]),
  date: z.string(),
  amountCents: z.number().int().min(0),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(100),
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
    }),
  ).min(1).max(1000),
});

export type ConfirmTransactionImportInput = z.infer<typeof confirmTransactionImportSchema>;
