import { describe, expect, it } from "vitest";

import {
  parseInvestmentRows,
  withInvestmentImportFingerprints,
} from "@/app/lib/investments/import/investment-import-parser";

describe("investment import parser", () => {
  it("parses B3 movement rows and preserves operation value with rounding adjustment", () => {
    const items = parseInvestmentRows(
      [
        [
          "Entrada/Saída",
          "Data",
          "Movimentação",
          "Produto",
          "Instituição",
          "Quantidade",
          "Preço unitário",
          "Valor da Operação",
        ],
        [
          "Credito",
          "09/12/2024",
          "Transferência - Liquidação",
          "MXRF11 - MAXI RENDA FDO INV IMOB - FII",
          "Nubank Investimentos",
          "137",
          "9,124",
          "1.249,99",
        ],
        [
          "Credito",
          "09/02/2026",
          "Transferência - Liquidação",
          "VGIR11 - VALORA CRI CDI FUNDO DE INVESTIMENTO IMOBILIÁRIO",
          "Nubank Investimentos",
          "126",
          "9,826",
          "1.238,08",
        ],
      ],
      "XLSX",
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "OPERATIONS",
      symbol: "MXRF11",
      assetType: "FII",
      quantity: "137",
      unitPriceCents: 912,
      feesCents: 55,
      amountCents: 124999,
      operationType: "BUY",
      errors: [],
    });
    expect(items[1]).toMatchObject({
      kind: "OPERATIONS",
      symbol: "VGIR11",
      quantity: "126",
      unitPriceCents: 982,
      feesCents: 76,
      amountCents: 123808,
      errors: [],
    });
  });

  it("parses B3 income rows and Brazilian thousands quantity", () => {
    const items = parseInvestmentRows(
      [
        [
          "Produto",
          "Pagamento",
          "Tipo de Evento",
          "Instituição",
          "Quantidade",
          "Preço unitário",
          "Valor líquido",
        ],
        [
          "MXRF11 - MAXI RENDA FDO INV IMOB - FII",
          "15/09/2026",
          "Rendimento",
          "Nubank Investimentos",
          "2.100",
          "0,10",
          "210,00",
        ],
      ],
      "XLSX",
    );

    expect(items).toEqual([
      expect.objectContaining({
        kind: "INCOMES",
        symbol: "MXRF11",
        assetType: "FII",
        date: "2026-09-15",
        quantity: "2100",
        incomeType: "INCOME",
        unitValueCents: 10,
        netAmountCents: 21000,
        errors: [],
      }),
    ]);
  });

  it("accepts Excel serial dates", () => {
    const items = parseInvestmentRows(
      [
        [
          "Produto",
          "Pagamento",
          "Tipo de Evento",
          "Instituição",
          "Quantidade",
          "Preço unitário",
          "Valor líquido",
        ],
        [
          "VGIR11 - VALORA CRI CDI FUNDO DE INVESTIMENTO IMOBILIÁRIO",
          "46292",
          "Rendimento",
          "Nubank Investimentos",
          "306",
          "0,13",
          "39,78",
        ],
      ],
      "XLSX",
    );

    expect(items[0]?.date).toMatch(/^2026-/);
    expect(items[0]?.errors).toEqual([]);
  });

  it("generates stable fingerprints and distinguishes repeated rows", () => {
    const parsed = parseInvestmentRows(
      [
        [
          "Produto",
          "Pagamento",
          "Tipo de Evento",
          "Instituição",
          "Quantidade",
          "Preço unitário",
          "Valor líquido",
        ],
        [
          "MXRF11 - MAXI RENDA FDO INV IMOB - FII",
          "15/09/2026",
          "Rendimento",
          "Nubank Investimentos",
          "2.100",
          "0,10",
          "210,00",
        ],
        [
          "MXRF11 - MAXI RENDA FDO INV IMOB - FII",
          "15/09/2026",
          "Rendimento",
          "Nubank Investimentos",
          "2.100",
          "0,10",
          "210,00",
        ],
      ],
      "CSV",
    );

    const first = withInvestmentImportFingerprints({
      userId: "user-1",
      accountId: "account-1",
      items: parsed,
    });
    const second = withInvestmentImportFingerprints({
      userId: "user-1",
      accountId: "account-1",
      items: parsed,
    });

    expect(first[0]?.fingerprint).toBe(second[0]?.fingerprint);
    expect(first[0]?.fingerprint).not.toBe(first[1]?.fingerprint);
  });
});
