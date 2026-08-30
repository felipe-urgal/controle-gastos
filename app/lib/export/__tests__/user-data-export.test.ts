import { describe, expect, it } from "vitest";
import {
  buildUserDataSnapshot,
  escapeCsvField,
  formatExportDate,
  sanitizeSpreadsheetText,
  serializeTransactionsCsv,
} from "@/app/lib/export/user-data-export";

describe("user data export serializers", () => {
  it("formats dates without locale ambiguity", () => {
    expect(formatExportDate(2026, 8, 3)).toBe("2026-08-03");
  });

  it("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
    expect(escapeCsvField('Mercado, "Centro"\nlinha 2')).toBe(
      '"Mercado, ""Centro""\nlinha 2"'
    );
    expect(sanitizeSpreadsheetText("=HYPERLINK(\"https://example.test\")")).toBe(
      "'=HYPERLINK(\"https://example.test\")"
    );
    expect(sanitizeSpreadsheetText("  +1+1")).toBe("'  +1+1");
    expect(sanitizeSpreadsheetText("Alimentação")).toBe("Alimentação");
  });

  it("keeps transaction amounts as exact integer cents in CSV", () => {
    const csv = serializeTransactionsCsv([
      {
        id: "transaction-1",
        amount: 12345,
        year: 2026,
        month: 8,
        day: 30,
        type: "EXPENSE",
        status: "COMPLETED",
        description: "=1+1",
        createdAt: new Date("2026-08-30T10:00:00.000Z"),
        updatedAt: new Date("2026-08-30T10:00:00.000Z"),
        account: {
          id: "account-1",
          name: 'Conta, "principal"',
          currency: "BRL",
        },
        category: {
          id: "category-1",
          name: "Alimentação",
          type: "EXPENSE",
        },
      },
    ]);

    expect(csv).toContain('"2026-08-30"');
    expect(csv).toContain('"12345"');
    expect(csv).toContain('"Conta, ""principal"""');
    expect(csv).toContain('"\'=1+1"');
  });

  it("builds JSON without authentication fields and with amountCents", () => {
    const snapshot = buildUserDataSnapshot({
      exportedAt: new Date("2026-08-30T12:00:00.000Z"),
      accounts: [],
      categories: [],
      transactions: [
        {
          id: "transaction-1",
          amount: 99,
          year: 2026,
          month: 1,
          day: 2,
          type: "INCOME",
          status: "PENDING",
          description: "Teste",
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          account: { id: "account-1", name: "Conta", currency: "BRL" },
          category: { id: "category-1", name: "Receita", type: "INCOME" },
        },
      ],
    });

    expect(snapshot.transactions[0]).toMatchObject({
      date: "2026-01-02",
      amountCents: 99,
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /password|jwt|resetToken|rateLimit|userId/i
    );
  });
});
