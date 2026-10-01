import { z } from "zod";

import { normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";

export const merchantAliasOperatorSchema = z.enum(["EQUALS", "STARTS_WITH", "CONTAINS"]);

export const merchantAliasPatternSchema = z
  .string()
  .trim()
  .min(2, "Padrão deve ter pelo menos 2 caracteres")
  .max(120, "Padrão não pode exceder 120 caracteres");

export const createMerchantAliasSchema = z
  .object({
    merchantId: z.uuid("Estabelecimento inválido"),
    operator: merchantAliasOperatorSchema,
    pattern: merchantAliasPatternSchema,
    priority: z.number().int().min(0).max(1000).optional().default(100),
  })
  .superRefine((data, ctx) => {
    const normalized = normalizeMerchantAliasValue(data.pattern);
    if (data.operator === "CONTAINS" && normalized.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["pattern"],
        message: "Padrões CONTAINS precisam ter pelo menos 3 caracteres",
      });
    }
  });

export const testMerchantAliasSchema = z.object({
  operator: merchantAliasOperatorSchema,
  pattern: merchantAliasPatternSchema,
  description: z.string().trim().min(1).max(255),
});
