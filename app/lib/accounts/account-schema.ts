import { z } from "zod";

import {
  ACCOUNT_DESCRIPTION_MAX_LENGTH,
  ACCOUNT_ICON_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
} from "@/app/lib/constants/account.constants";

const MAX_CENTS = 2_147_483_647;

function validateCreditCardFields(
  data: {
    type: "CREDIT_DEBIT" | "INVESTMENT" | "CREDIT_CARD";
    creditLimit?: number | null;
    statementClosingDay?: number | null;
    statementDueDay?: number | null;
  },
  context: z.RefinementCtx,
) {
  const cardFields = [
    ["creditLimit", data.creditLimit, "Informe o limite do cartão"],
    ["statementClosingDay", data.statementClosingDay, "Informe o dia de fechamento"],
    ["statementDueDay", data.statementDueDay, "Informe o dia de vencimento"],
  ] as const;

  if (data.type === "CREDIT_CARD") {
    for (const [path, value, message] of cardFields) {
      if (value === null || value === undefined) {
        context.addIssue({ code: "custom", path: [path], message });
      }
    }
    return;
  }

  for (const [path, value] of cardFields) {
    if (value !== null && value !== undefined) {
      context.addIssue({
        code: "custom",
        path: [path],
        message: "Configuração de fatura é exclusiva de cartão de crédito",
      });
    }
  }
}

const accountBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(ACCOUNT_NAME_MAX_LENGTH, `Nome não pode exceder ${ACCOUNT_NAME_MAX_LENGTH} caracteres`),

  type: z.enum(["CREDIT_DEBIT", "INVESTMENT", "CREDIT_CARD"]),

  currency: z.enum(["BRL", "USD", "EUR"]),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Formato de cor inválido (#RRGGBB)")
    .optional(),

  icon: z.string().max(ACCOUNT_ICON_MAX_LENGTH).optional(),

  description: z.string().max(ACCOUNT_DESCRIPTION_MAX_LENGTH).nullable(),

  isActive: z.boolean(),

  creditLimit: z.number().int().positive().max(MAX_CENTS).nullable().optional(),
  statementClosingDay: z.number().int().min(1).max(31).nullable().optional(),
  statementDueDay: z.number().int().min(1).max(31).nullable().optional(),
});

export const createAccountSchema = accountBaseSchema
  .extend({
    currency: accountBaseSchema.shape.currency.default("BRL"),
    isActive: accountBaseSchema.shape.isActive.default(true),
  })
  .superRefine(validateCreditCardFields);

export const updateAccountSchema = accountBaseSchema.partial();

const accountCardStateSchema = z
  .object({
    type: accountBaseSchema.shape.type,
    creditLimit: accountBaseSchema.shape.creditLimit,
    statementClosingDay: accountBaseSchema.shape.statementClosingDay,
    statementDueDay: accountBaseSchema.shape.statementDueDay,
  })
  .superRefine(validateCreditCardFields);

export function validateAccountUpdateState(
  data: z.infer<typeof updateAccountSchema>,
  existing: {
    type: "CREDIT_DEBIT" | "INVESTMENT" | "CREDIT_CARD";
    creditLimit?: number | null;
    statementClosingDay?: number | null;
    statementDueDay?: number | null;
  },
) {
  accountCardStateSchema.parse({
    type: data.type ?? existing.type,
    creditLimit:
      data.creditLimit !== undefined ? data.creditLimit : existing.creditLimit,
    statementClosingDay:
      data.statementClosingDay !== undefined
        ? data.statementClosingDay
        : existing.statementClosingDay,
    statementDueDay:
      data.statementDueDay !== undefined
        ? data.statementDueDay
        : existing.statementDueDay,
  });
  return data;
}
