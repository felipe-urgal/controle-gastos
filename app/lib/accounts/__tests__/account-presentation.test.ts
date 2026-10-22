import { describe, expect, it } from "vitest";

import { creditCardRowSummary } from "@/app/lib/accounts/account-presentation";
import type { AccountModel } from "@/app/types/account";

function card(overrides: Partial<AccountModel> = {}): AccountModel {
  return {
    id: "c1",
    name: "Nubank",
    type: "CREDIT_CARD",
    balance: 0,
    currency: "BRL",
    isActive: true,
    creditLimit: 600_000,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    transactions: [],
    cardStatus: {
      usedLimit: 205_000,
      availableLimit: 395_000,
      overLimit: 0,
      nextStatement: {
        amount: 124_000,
        closingDate: { year: 2026, month: 10, day: 10 },
        dueDate: { year: 2026, month: 10, day: 24 },
        transactionCount: 4,
      },
      overdueCount: 0,
    },
    ...overrides,
  };
}

describe("creditCardRowSummary", () => {
  it("resume fatura, limite usado e vencimento", () => {
    expect(creditCardRowSummary(card())).toEqual({
      statementAmount: 124_000,
      statementDueDate: { year: 2026, month: 10, day: 24 },
      usedLimit: 205_000,
      creditLimit: 600_000,
      usedPercent: 34,
      tone: "ok",
      overdueCount: 0,
    });
  });

  it("marca perto do limite a partir de 90% e acima do limite como excedido", () => {
    const near = card({ cardStatus: { ...card().cardStatus!, usedLimit: 540_000 } });
    const over = card({ cardStatus: { ...card().cardStatus!, usedLimit: 610_000 } });

    expect(creditCardRowSummary(near)?.tone).toBe("near");
    expect(creditCardRowSummary(over)).toMatchObject({ tone: "over", usedPercent: 102 });
  });

  it("usa a mesma regra de 90% da lista de atenção, sem arredondar para cima", () => {
    const almost = card({ cardStatus: { ...card().cardStatus!, usedLimit: 539_999 } });

    expect(creditCardRowSummary(almost)).toMatchObject({ usedPercent: 90, tone: "ok" });
  });

  it("não calcula percentual sem limite configurado", () => {
    const summary = creditCardRowSummary(card({ creditLimit: null }));

    expect(summary).toMatchObject({ creditLimit: null, usedPercent: null, tone: "ok" });
  });

  it("aceita cartão sem fatura aberta", () => {
    const summary = creditCardRowSummary(card({ cardStatus: { usedLimit: 0, availableLimit: 600_000, overLimit: 0, nextStatement: null, overdueCount: 0 } }));

    expect(summary).toMatchObject({ statementAmount: null, statementDueDate: null });
  });

  it("devolve null para contas que não são cartão ou sem status", () => {
    expect(creditCardRowSummary(card({ type: "CREDIT_DEBIT" }))).toBeNull();
    expect(creditCardRowSummary(card({ cardStatus: null }))).toBeNull();
  });
});
