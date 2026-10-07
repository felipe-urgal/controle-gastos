import { describe, expect, it } from "vitest";

import {
  IMPORT_MAX_ITEMS,
  ImportParseError,
  parseCsvImport,
  parseImportContent,
  parseMoneyToCents,
  parseOfxImport,
  parseQifImport,
  withImportFingerprints,
} from "@/app/lib/transactions/import/parser";
import { parseXlsxImport } from "@/app/lib/transactions/import/xlsx-parser";
import {
  createXlsxFixture,
  xlsxFormula,
  xlsxNumber,
  xlsxText,
} from "@/app/lib/transactions/import/__tests__/xlsx-fixture";

describe("transaction import parser", () => {
  it("parses CSV values into exact integer cents", () => {
    const items = parseCsvImport([
      "Data;Descrição;Valor",
      "31/08/2026;Café;-10,01",
      "2026-08-30;Salário;1.234,56",
    ].join("\n"));

    expect(items).toMatchObject([
      { date: "2026-08-31", amountCents: 1001, type: "EXPENSE", description: "Café", errors: [] },
      { date: "2026-08-30", amountCents: 123456, type: "INCOME", description: "Salário", errors: [] },
    ]);
    expect(parseMoneyToCents("0,29")).toBe(29);
    expect(parseMoneyToCents("-0.29")).toBe(-29);
  });

  it("keeps invalid CSV rows in the preview with textual reasons", () => {
    const [item] = parseCsvImport("data,descricao,valor\n31/02/2026,,abc");
    expect(item.errors).toEqual(expect.arrayContaining([
      "Data inválida.",
      "Valor inválido ou igual a zero.",
      "Descrição deve ter pelo menos 2 caracteres.",
    ]));
  });


  it("parses XLSX through the canonical tabular contract with serial and textual dates", () => {
    const items = parseXlsxImport(createXlsxFixture({
      rows: [
        [xlsxText("Date"), xlsxText("Memo"), xlsxText("Amount"), xlsxText("Transaction ID")],
        [xlsxNumber("46265"), xlsxText("Café"), xlsxNumber("-10.01"), xlsxText("xlsx-1")],
        [xlsxText("30/08/2026"), xlsxText("Salário"), xlsxText("R$ 1.234,56"), xlsxText("xlsx-2")],
      ],
    }));

    expect(items).toMatchObject([
      {
        source: "XLSX",
        date: "2026-08-31",
        amountCents: 1001,
        type: "EXPENSE",
        description: "Café",
        externalId: "xlsx-1",
        errors: [],
      },
      {
        source: "XLSX",
        date: "2026-08-30",
        amountCents: 123456,
        type: "INCOME",
        description: "Salário",
        externalId: "xlsx-2",
        errors: [],
      },
    ]);
  });

  it("uses only the first XLSX worksheet", () => {
    const items = parseXlsxImport(createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("2026-08-31"), xlsxText("Primeira"), xlsxNumber("-12.50")],
      ],
      secondSheetRows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("2026-08-30"), xlsxText("Segunda"), xlsxNumber("-99.99")],
      ],
    }));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ description: "Primeira", amountCents: 1250 });
  });

  it("rejects formulas as XLSX data sources", () => {
    const fixture = createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("2026-08-31"), xlsxText("Fórmula"), xlsxFormula("1+1", "2")],
      ],
    });

    expect(() => parseXlsxImport(fixture)).toThrow("XLSX com fórmulas não é aceito como fonte de dados.");
  });

  it("keeps invalid XLSX rows for review and preserves fingerprint stability", () => {
    const fixture = createXlsxFixture({
      rows: [
        [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
        [xlsxText("31/02/2026"), xlsxText(""), xlsxText("abc")],
        [xlsxText("2026-08-31"), xlsxText("Café"), xlsxNumber("-10.00")],
      ],
    });
    const items = parseXlsxImport(fixture);

    expect(items[0].errors).toEqual(expect.arrayContaining([
      "Data inválida.",
      "Valor inválido ou igual a zero.",
      "Descrição deve ter pelo menos 2 caracteres.",
    ]));

    const first = withImportFingerprints({ userId: "u1", accountId: "a1", items });
    const second = withImportFingerprints({ userId: "u1", accountId: "a1", items });
    expect(first.map((item) => item.fingerprint)).toEqual(second.map((item) => item.fingerprint));
  });

  it("rejects XLSX above the transaction count limit", () => {
    const rows = [
      [xlsxText("data"), xlsxText("descricao"), xlsxText("valor")],
      ...Array.from({ length: IMPORT_MAX_ITEMS + 1 }, (_, index) => [
        xlsxText("2026-08-31"),
        xlsxText(`item ${index}`),
        xlsxNumber("-1.00"),
      ]),
    ];

    expect(() => parseXlsxImport(createXlsxFixture({ rows }))).toThrow(ImportParseError);
  });

  it("parses OFX and preserves FITID plus reliable account metadata", () => {
    const { items: [item], accountMetadata } = parseOfxImport(
      `OFXHEADER:100\n<OFX><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>12345</BANKACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260831120000[-3:BRT]<TRNAMT>-42.37<FITID>bank-123<NAME>Mercado<MEMO>Compra</STMTTRN></BANKTRANLIST></OFX>`,
      "BRL",
    );

    expect(accountMetadata).toEqual({
      type: "BANK",
      accountId: "12345",
    });
    expect(item).toMatchObject({
      date: "2026-08-31",
      amountCents: 4237,
      type: "EXPENSE",
      description: "Mercado — Compra",
      externalId: "bank-123",
      currency: "BRL",
      errors: [],
    });
  });

  it("extracts credit-card metadata from CCACCTFROM", () => {
    const result = parseOfxImport(
      "<OFX><CURDEF>BRL<CCACCTFROM><ACCTID>card-987</CCACCTFROM><BANKTRANLIST><STMTTRN><DTPOSTED>20260831<TRNAMT>-10.00<NAME>Compra</STMTTRN></BANKTRANLIST></OFX>",
      "BRL",
    );

    expect(result.accountMetadata).toEqual({
      type: "CREDIT_CARD",
      accountId: "card-987",
    });
  });

  it("rejects OFX with a currency different from the selected account", () => {
    expect(() => parseOfxImport("<OFX><CURDEF>USD<STMTTRN><DTPOSTED>20260831<TRNAMT>10.00<NAME>A</STMTTRN></OFX>", "BRL"))
      .toThrow("Moeda do OFX (USD) difere da moeda da conta (BRL).");
  });

  it("creates stable fingerprints without collapsing legitimate identical rows", () => {
    const items = parseCsvImport("data,descricao,valor\n2026-08-31,Café,-10.00\n2026-08-31,Café,-10.00");
    const first = withImportFingerprints({ userId: "u1", accountId: "a1", items });
    const second = withImportFingerprints({ userId: "u1", accountId: "a1", items });

    expect(first.map((item) => item.fingerprint)).toEqual(second.map((item) => item.fingerprint));
    expect(first[0].fingerprint).not.toBe(first[1].fingerprint);
  });

  it("rejects files above the transaction count limit", () => {
    const rows = Array.from({ length: IMPORT_MAX_ITEMS + 1 }, (_, index) => `2026-08-31,item ${index},-1.00`);
    expect(() => parseCsvImport(["data,descricao,valor", ...rows].join("\n"))).toThrow(ImportParseError);
  });
  it("treats QFX as OFX and preserves FITID/currency validation", () => {
    const content = "OFXHEADER:100\n<OFX><CURDEF>BRL<BANKTRANLIST><STMTTRN><DTPOSTED>20260831<TRNAMT>-42.37<FITID>qfx-1<NAME>Mercado</STMTTRN></BANKTRANLIST></OFX>";
    const [ofx] = parseImportContent({ fileName: "extrato.ofx", content, accountCurrency: "BRL" });
    const [qfx] = parseImportContent({ fileName: "extrato.qfx", content, accountCurrency: "BRL" });

    expect(qfx).toEqual(ofx);
    expect(qfx).toMatchObject({ source: "OFX", externalId: "qfx-1", currency: "BRL" });
    expect(() => parseImportContent({
      fileName: "extrato.qfx",
      content: content.replace("<CURDEF>BRL", "<CURDEF>USD"),
      accountCurrency: "BRL",
    })).toThrow("Moeda do OFX (USD) difere da moeda da conta (BRL).");
  });

  it("parses QIF income/expense, payee/memo and common date forms", () => {
    const { items, sectionType } = parseQifImport([
      "!Type:Bank",
      "D8/31'26",
      "T-42.37",
      "PMercado",
      "MCompra do mês",
      "^",
      "D31/08/2026",
      "T1234.56",
      "PSalário",
      "^",
    ].join("\n"));

    expect(sectionType).toBe("BANK");
    expect(items).toMatchObject([
      {
        source: "QIF",
        date: "2026-08-31",
        amountCents: 4237,
        type: "EXPENSE",
        description: "Mercado — Compra do mês",
        errors: [],
      },
      {
        source: "QIF",
        date: "2026-08-31",
        amountCents: 123456,
        type: "INCOME",
        description: "Salário",
        errors: [],
      },
    ]);
    expect(items.every((item) => item.externalId === undefined)).toBe(true);

    const { items: [ambiguous] } = parseQifImport([
      "!Type:Bank",
      "D8/9/2026",
      "T1.00",
      "PTeste",
      "^",
    ].join("\n"));
    expect(ambiguous.date).toBe("2026-08-09");
  });

  it("keeps malformed QIF transactions in preview with item-level reasons", () => {
    const { items: [item], sectionType } = parseQifImport([
      "!Type:Cash",
      "D31/02/2026",
      "Tabc",
      "Xunexpected",
      "^",
    ].join("\n"));

    expect(sectionType).toBe("CASH");
    expect(item.errors).toEqual(expect.arrayContaining([
      "Data inválida.",
      "Valor inválido ou igual a zero.",
      "Payee ou descrição ausente.",
      "Campo QIF não suportado: X.",
    ]));
  });

  it("rejects unsupported or truncated QIF sections", () => {
    expect(() => parseQifImport("!Type:Invst\nD8/31/2026\nT10.00\nPAtivo\n^"))
      .toThrow("Seção QIF não suportada: !Type:Invst.");
    expect(() => parseQifImport("!Type:Bank\nD8/31/2026\nT10.00\nPEntrada"))
      .toThrow("QIF truncado: a última transação não termina com ^.");
  });

  it("rejects QIF above the global transaction count limit", () => {
    const records = Array.from({ length: IMPORT_MAX_ITEMS + 1 }, (_, index) =>
      ["D8/31/2026", "T-1.00", `Pitem ${index}`, "^"].join("\n"),
    );
    expect(() => parseQifImport(["!Type:Bank", ...records].join("\n")))
      .toThrow(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} transações.`);
  });

  it("keeps QIF fingerprints stable without inventing external identity", () => {
    const { items } = parseQifImport([
      "!Type:Bank",
      "D8/31/2026",
      "T-10.00",
      "PCafé",
      "^",
    ].join("\n"));
    const first = withImportFingerprints({ userId: "u1", accountId: "a1", items });
    const second = withImportFingerprints({ userId: "u1", accountId: "a1", items });

    expect(first[0].fingerprint).toBe(second[0].fingerprint);
    expect(first[0].externalId).toBeUndefined();
  });

});
