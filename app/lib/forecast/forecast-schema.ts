import { z } from "zod";

const forecastDaysSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.union([z.literal(30), z.literal(60), z.literal(90)])
);

export const forecastQuerySchema = z.object({
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  days: forecastDaysSchema.default(30),
});

export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;
