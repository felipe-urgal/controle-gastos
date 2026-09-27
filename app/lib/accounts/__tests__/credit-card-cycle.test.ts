import { describe, expect, it } from "vitest";

import { resolveCreditCardStatementCycle } from "@/app/lib/accounts/credit-card-cycle";

describe("resolveCreditCardStatementCycle", () => {
  it("mantém compra anterior ao fechamento na fatura do mês", () => {
    expect(
      resolveCreditCardStatementCycle({
        purchaseDate: { year: 2026, month: 9, day: 4 },
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
    ).toEqual({
      closingDate: { year: 2026, month: 9, day: 5 },
      dueDate: { year: 2026, month: 9, day: 12 },
    });
  });

  it("leva compra no dia do fechamento para o próximo ciclo", () => {
    expect(
      resolveCreditCardStatementCycle({
        purchaseDate: { year: 2026, month: 9, day: 5 },
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
    ).toEqual({
      closingDate: { year: 2026, month: 10, day: 5 },
      dueDate: { year: 2026, month: 10, day: 12 },
    });
  });

  it("move o vencimento para o mês seguinte quando ele precede o fechamento", () => {
    expect(
      resolveCreditCardStatementCycle({
        purchaseDate: { year: 2026, month: 9, day: 10 },
        statementClosingDay: 25,
        statementDueDay: 2,
      }),
    ).toEqual({
      closingDate: { year: 2026, month: 9, day: 25 },
      dueDate: { year: 2026, month: 10, day: 2 },
    });
  });

  it("faz clamp previsível em fevereiro sem vencimento anterior ao fechamento", () => {
    expect(
      resolveCreditCardStatementCycle({
        purchaseDate: { year: 2027, month: 2, day: 27 },
        statementClosingDay: 30,
        statementDueDay: 31,
      }),
    ).toEqual({
      closingDate: { year: 2027, month: 2, day: 28 },
      dueDate: { year: 2027, month: 3, day: 31 },
    });
  });

  it("rejeita dias de ciclo fora do intervalo", () => {
    expect(() =>
      resolveCreditCardStatementCycle({
        purchaseDate: { year: 2026, month: 9, day: 1 },
        statementClosingDay: 0,
        statementDueDay: 12,
      }),
    ).toThrow("Dia de fechamento deve estar entre 1 e 31");
  });
});
