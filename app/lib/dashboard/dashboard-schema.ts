import { z } from "zod";

export const dashboardPeriodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
});

export type DashboardPeriodInput = z.infer<typeof dashboardPeriodSchema>;
