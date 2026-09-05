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
        kind: "NORMAL",
        status: "COMPLETED",
        description: "=1+1",
        transferId: null,
        transferRole: null,
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
    expect(csv).toContain('"NORMAL"');
    expect(csv).toContain('"Conta, ""principal"""');
    expect(csv).toContain('"\'=1+1"');
  });

  it("exports linked transfer legs without requiring an artificial category", () => {
    const csv = serializeTransactionsCsv([
      {
        id: "transfer-source",
        amount: 5000,
        year: 2026,
        month: 9,
        day: 5,
        type: "EXPENSE",
        kind: "TRANSFER",
        status: "COMPLETED",
        description: "Reserva",
        transferId: "transfer-1",
        transferRole: "SOURCE",
        createdAt: new Date("2026-09-05T10:00:00.000Z"),
        updatedAt: new Date("2026-09-05T10:00:00.000Z"),
        account: { id: "checking", name: "Conta", currency: "BRL" },
        category: null,
      },
    ]);

    expect(csv.split("\r\n")[0]).toContain('"kind"');
    expect(csv).toContain('"TRANSFER"');
    expect(csv).toContain('"transfer-1"');
    expect(csv).toContain('"SOURCE"');
  });

  it("builds JSON v2 without authentication fields and with transfer metadata", () => {
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
          kind: "NORMAL",
          status: "PENDING",
          description: "Teste",
          transferId: null,
          transferRole: null,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          account: { id: "account-1", name: "Conta", currency: "BRL" },
          category: { id: "category-1", name: "Receita", type: "INCOME" },
        },
        {
          id: "transfer-destination",
          amount: 1000,
          year: 2026,
          month: 1,
          day: 3,
          type: "INCOME",
          kind: "TRANSFER",
          status: "COMPLETED",
          description: "Transferência",
          transferId: "transfer-1",
          transferRole: "DESTINATION",
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
          updatedAt: new Date("2026-01-03T00:00:00.000Z"),
          account: { id: "account-2", name: "Reserva", currency: "BRL" },
          category: null,
        },
      ],
    });

    expect(snapshot.formatVersion).toBe(2);
    expect(snapshot.transactions[0]).toMatchObject({
      date: "2026-01-02",
      amountCents: 99,
      kind: "NORMAL",
      transfer: null,
    });
    expect(snapshot.transactions[1]).toMatchObject({
      kind: "TRANSFER",
      category: null,
      transfer: { id: "transfer-1", role: "DESTINATION" },
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /password|jwt|resetToken|rateLimit|userId/i
    );
  });
});
