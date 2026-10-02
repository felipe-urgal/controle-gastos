import { z } from "zod";

import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";

const MAX_CENTS = 2_147_483_647;

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value?.trim() || null);

function validLogicalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const createInvestmentAssetSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Informe o código do ativo")
    .max(24, "Código do ativo muito longo")
    .transform((value) => value.toUpperCase()),
  name: optionalTrimmed(120),
  type: z.enum(["STOCK", "FII", "ETF", "FIXED_INCOME", "CRYPTO", "FUND", "OTHER"]),
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  market: optionalTrimmed(40).transform((value) => value?.toUpperCase() ?? null),
});

export const createInvestmentOperationSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  accountId: z.string().uuid("Conta inválida"),
  assetId: z.string().uuid("Ativo inválido"),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade")
    .refine((value) => parseInvestmentQuantity(value) !== null, {
      message: "Quantidade deve ser positiva e ter no máximo 8 casas decimais",
    }),
  unitPriceCents: z
    .number()
    .int()
    .positive("Preço unitário deve ser positivo")
    .max(MAX_CENTS),
  feesCents: z.number().int().min(0).max(MAX_CENTS).default(0),
  date: z.string().refine(validLogicalDate, "Data inválida"),
  note: optionalTrimmed(500),
});

export type CreateInvestmentAssetInput = z.infer<
  typeof createInvestmentAssetSchema
>;
export type CreateInvestmentOperationInput = z.infer<
  typeof createInvestmentOperationSchema
>;


export const updateInvestmentFiscalEventSchema = z.object({
  type: z.enum([
    "BUY",
    "SELL",
    "CUSTODY_TRANSFER_IN",
    "CUSTODY_TRANSFER_OUT",
    "BONUS",
    "SPLIT",
    "REVERSE_SPLIT",
    "OTHER",
  ]),
  sourceInstitution: optionalTrimmed(120),
  destinationInstitution: optionalTrimmed(120),
  reclassificationNote: optionalTrimmed(500),
});

export type UpdateInvestmentFiscalEventInput = z.infer<
  typeof updateInvestmentFiscalEventSchema
>;
