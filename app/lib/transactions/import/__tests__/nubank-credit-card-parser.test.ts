import { describe, expect, it } from "vitest";

import {
  isNubankCreditCardCsv,
  parseNubankCreditCardCsv,
} from "@/app/lib/transactions/import/nubank-credit-card-parser";

describe("Nubank credit card CSV parser", () => {
  it("detects purchases, payments and credits without turning payment into common income", () => {
    const csv = [
      "date,title,amount",
      "2026-09-01,Supermercado,123.45",
      "2026-09-05,Pagamento recebido,-100.00",
      "2026-09-07,IOF de volta Viagem,-2.35",
      "2026-09-08,Loja Parcela 2/6,50.00",
    ].join("\n");

    expect(isNubankCreditCardCsv(csv)).toBe(true);
    const parsed = parseNubankCreditCardCsv(csv);

    expect(parsed.summary).toEqual({ purchases: 2, payments: 1, credits: 1 });
    expect(parsed.items[0]).toMatchObject({
      type: "EXPENSE",
      amountCents: 12345,
      description: "Supermercado",
      errors: [],
    });
    expect(parsed.items[1].type).toBe("INCOME");
    expect(parsed.items[1].errors.join(" ")).toContain("não será importado como receita");
    expect(parsed.items[2]).toMatchObject({
      type: "INCOME",
      amountCents: 235,
    });
    expect(parsed.items[3].description).toBe("Loja Parcela 2/6");
  });
});
