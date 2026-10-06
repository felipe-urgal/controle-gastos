import { z } from "zod";

const includeRealEvolutionSchema = z
  .union([z.literal("1"), z.literal("true")])
  .transform(() => true)
  .optional();

export const netWorthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  months: z.coerce.number().int().min(1).max(60).default(12),
  baseCurrency: z.enum(["BRL", "USD", "EUR"]).optional(),
  includeRealEvolution: includeRealEvolutionSchema,
});

export type NetWorthQueryInput = z.infer<typeof netWorthQuerySchema>;
