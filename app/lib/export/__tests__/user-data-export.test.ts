import { describe, expect, it } from "vitest";

import {
  escapeCsvField,
  formatExportDate,
  sanitizeSpreadsheetText,
  serializeTransactionsCsv,
} from "@/app/lib/export/user-data-export";

describe("user data CSV export serializers", () => {
  it("formats dates without locale ambiguity", () => {
    expect(formatExportDate(2026, 8, 3)).toBe("2026-08-03");
  });

  it("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
    expect(escapeCsvField('Mercado, "Centro"\nlinha 2')).toBe(
      '"Mercado, ""Centro""\nlinha 2"',
    );
    expect(sanitizeSpreadsheetText('=HYPERLINK("https://example.test")')).toBe(
      '\'=HYPERLINK("https://example.test")',
    );
    expect(sanitizeSpreadsheetText("  +SUM(A1:A2)")).toBe(
      "'  +SUM(A1:A2)",
    );
    expect(sanitizeSpreadsheetText("texto normal")).toBe("texto normal");
  });

  it("keeps CSV scoped to transaction-oriented columns", () => {
    const csv = serializeTransactionsCsv([
      {
        id: "transaction-1",
        amount: 12345,
        year: 2026,
        month: 9,
        day: 5,
        type: "EXPENSE",
        kind: "TRANSFER",
        status: "COMPLETED",
        description: '=HYPERLINK("https://example.test")',
        transferId: "transfer-1",
        transferRole: "SOURCE",
        createdAt: new Date("2026-09-05T10:00:00.000Z"),
        updatedAt: new Date("2026-09-05T10:00:00.000Z"),
        account: { id: "checking", name: "Conta", currency: "BRL" },
        category: null,
        tags: [{ id: "tag-1", name: "viagem" }],
      },
    ]);

    expect(csv.split("\r\n")[0]).toContain('"transactionId"');
    expect(csv).toContain('"2026-09-05"');
    expect(csv).toContain('"12345"');
    expect(csv).toContain('"TRANSFER"');
    expect(csv).toContain('"transfer-1"');
    expect(csv).toContain('"SOURCE"');
    expect(csv).toContain('"#viagem"');
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
  });
});
