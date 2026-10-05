import { describe, expect, it } from "vitest";

import { buildCreditCardStatements } from "@/app/lib/cards/credit-card-statements";

describe("buildCreditCardStatements", () => {
  const config = {
    statementClosingDay: 5,
    statementDueDay: 12,
  };

  it("separa histórico, fatura atual e futuras pelo fechamento", () => {
    const result = buildCreditCardStatements({
      asOf: { year: 2026, month: 9, day: 4 },
      ...config,
      transactions: [
        {
          id: "history",
          amount: 2_000,
          year: 2026,
          month: 8,
          day: 4,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Agosto",
        },
        {
          id: "current",
          amount: 3_000,
          year: 2026,
          month: 9,
          day: 4,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Setembro",
        },
        {
          id: "closing-day",
          amount: 4_000,
          year: 2026,
          month: 9,
          day: 5,
          type: "EXPENSE",
          status: "PENDING",
          description: "Próxima fatura",
        },
      ],
    });

    expect(result.current).toMatchObject({
      closingDate: { year: 2026, month: 9, day: 5 },
      dueDate: { year: 2026, month: 9, day: 12 },
      total: 3_000,
      completedTotal: 3_000,
      pendingTotal: 0,
      transactionCount: 1,
    });
    expect(result.history.map((item) => item.total)).toEqual([2_000]);
    expect(result.future.map((item) => item.total)).toEqual([4_000]);
  });

  it("distribui parcelas futuras sem duplicar valores", () => {
    const result = buildCreditCardStatements({
      asOf: { year: 2026, month: 9, day: 1 },
      ...config,
      transactions: [
        {
          id: "p1",
          amount: 3_334,
          year: 2026,
          month: 9,
          day: 1,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Notebook",
          seriesId: "series",
          seriesIndex: 1,
        },
        {
          id: "p2",
          amount: 3_334,
          year: 2026,
          month: 10,
          day: 1,
          type: "EXPENSE",
          status: "PENDING",
          description: "Notebook",
          seriesId: "series",
          seriesIndex: 2,
        },
        {
          id: "p3",
          amount: 3_333,
          year: 2026,
          month: 11,
          day: 1,
          type: "EXPENSE",
          status: "PENDING",
          description: "Notebook",
          seriesId: "series",
          seriesIndex: 3,
        },
      ],
    });

    expect(result.current.total).toBe(3_334);
    expect(result.future.map((item) => item.total)).toEqual([3_334, 3_333]);
    expect(
      result.current.total + result.future.reduce((sum, item) => sum + item.total, 0),
    ).toBe(10_001);
  });

  it("ignora cancelamentos e desconta créditos da fatura", () => {
    const result = buildCreditCardStatements({
      asOf: { year: 2026, month: 9, day: 1 },
      ...config,
      transactions: [
        {
          id: "cancelled",
          amount: 5_000,
          year: 2026,
          month: 9,
          day: 1,
          type: "EXPENSE",
          status: "CANCELLED",
          description: "Cancelada",
        },
        {
          id: "income",
          amount: 7_000,
          year: 2026,
          month: 9,
          day: 1,
          type: "INCOME",
          status: "COMPLETED",
          description: "Inválida para cartão",
        },
      ],
    });

    expect(result.current.total).toBe(-7_000);
    expect(result.current.completedTotal).toBe(-7_000);
    expect(result.current.transactionCount).toBe(1);
  });

  it("limita somente o histórico, preservando todas as faturas futuras", () => {
    const result = buildCreditCardStatements({
      asOf: { year: 2026, month: 9, day: 1 },
      ...config,
      historyLimit: 1,
      transactions: [
        {
          id: "jul",
          amount: 1_000,
          year: 2026,
          month: 7,
          day: 1,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Julho",
        },
        {
          id: "ago",
          amount: 2_000,
          year: 2026,
          month: 8,
          day: 1,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Agosto",
        },
        {
          id: "out",
          amount: 3_000,
          year: 2026,
          month: 10,
          day: 1,
          type: "EXPENSE",
          status: "PENDING",
          description: "Outubro",
        },
        {
          id: "nov",
          amount: 4_000,
          year: 2026,
          month: 11,
          day: 1,
          type: "EXPENSE",
          status: "PENDING",
          description: "Novembro",
        },
      ],
    });

    expect(result.history).toHaveLength(1);
    expect(result.history[0].total).toBe(2_000);
    expect(result.future.map((item) => item.total)).toEqual([3_000, 4_000]);
  });
});
