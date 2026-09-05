import { describe, expect, it } from "vitest";
import { forecastQuerySchema } from "@/app/schemas/forecast.schema";

describe("forecast query schema", () => {
  it("uses BRL and 30 days by default", () => {
    expect(forecastQuerySchema.parse({})).toEqual({
      currency: "BRL",
      days: 30,
    });
  });

  it("accepts the three supported currencies and 30/60/90 day strings", () => {
    expect(forecastQuerySchema.parse({ currency: "USD", days: "60" })).toEqual({
      currency: "USD",
      days: 60,
    });
    expect(forecastQuerySchema.parse({ currency: "EUR", days: "90" })).toEqual({
      currency: "EUR",
      days: 90,
    });
  });

  it("rejects unsupported horizons and currencies", () => {
    expect(forecastQuerySchema.safeParse({ days: "31" }).success).toBe(false);
    expect(
      forecastQuerySchema.safeParse({ currency: "GBP", days: "30" }).success
    ).toBe(false);
  });
});
