import { describe, expect, it } from "vitest";

import {
  allocateBrokerageFees,
  parseNubankBrokerageNoteText,
} from "@/app/lib/investments/import/nubank-brokerage-note-parser";

describe("Nu Investimentos brokerage note parser", () => {
  it("allocates note fees deterministically and preserves the total in cents", () => {
    const allocated = allocateBrokerageFees([32_500, 35_000], 320);
    expect(allocated).toHaveLength(2);
    expect(allocated.reduce((sum, value) => sum + value, 0)).toBe(320);
  });

  it("parses buy/sell businesses, note metadata, fees and IRRF", () => {
    const text = [
      "NOTA DE NEGOCIAÇÃO",
      "Nu Investimentos",
      "CNPJ 12.345.678/0001-90",
      "Número da nota: 12345",
      "Data pregão: 02/10/2026",
      "C VISTA PETR4 10 32,50 325,00 D",
      "V VISTA VALE3 5 70,00 350,00 C",
      "Taxa de liquidação 1,00",
      "Emolumentos 0,50",
      "Corretagem 1,50",
      "ISS 0,20",
      "I.R.R.F. 0,10",
      "Líquido para nota 671,80",
    ].join("\n");

    const parsed = parseNubankBrokerageNoteText(text);

    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]).toMatchObject({
      noteNumber: "12345",
      tradeDate: "2026-10-02",
      businesses: 2,
      allocableFeesCents: 320,
      irrfCents: 10,
    });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toMatchObject({
      source: "PDF",
      operationType: "BUY",
      symbol: "PETR4",
      quantity: "10",
      unitPriceCents: 3250,
      amountCents: 32500,
    });
    expect(parsed.items[1]).toMatchObject({
      operationType: "SELL",
      symbol: "VALE3",
      quantity: "5",
      unitPriceCents: 7000,
      amountCents: 35000,
    });
    expect(parsed.items.reduce((sum, item) => sum + item.feesCents, 0)).toBe(320);
    expect(parsed.items[0].brokerageNote.irrfCents).toBe(10);
  });
});
