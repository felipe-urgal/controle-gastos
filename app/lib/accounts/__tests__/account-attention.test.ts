import { describe, expect, it } from "vitest";

import { buildAccountAttention, MAX_ACCOUNT_ATTENTION_ITEMS, type AccountAttentionInput } from "@/app/lib/accounts/account-attention";
import type { CreditCardCommitment } from "@/app/lib/cards/credit-card-commitments";
import type { CreditCardStatus } from "@/app/lib/cards/credit-card-status";

const asOf = { year: 2026, month: 10, day: 22 };

function account(overrides: Partial<AccountAttentionInput> & Pick<AccountAttentionInput, "id" | "type">): AccountAttentionInput {
  return { name: `Conta ${overrides.id}`, currency: "BRL", isActive: true, balance: 0, creditLimit: null, ...overrides };
}

function statement(cardId: string, dueDay: number, amount = 124_000, dueMonth = 10): CreditCardCommitment {
  return {
    cardId,
    cardName: `Cartão ${cardId}`,
    amount,
    closingDate: { year: 2026, month: 10, day: 10 },
    dueDate: { year: 2026, month: dueMonth, day: dueDay },
    transactionCount: 2,
  };
}

function status(overrides: Partial<CreditCardStatus> = {}): CreditCardStatus {
  return { usedLimit: 100_000, nextStatement: null, overdueStatements: [], ...overrides };
}

describe("buildAccountAttention", () => {
  it("avisa saldo negativo só em conta corrente ativa", () => {
    const items = buildAccountAttention({
      asOf,
      cardStatuses: new Map(),
      accounts: [
        account({ id: "cc", type: "CREDIT_DEBIT", balance: -4_500 }),
        account({ id: "inv", type: "INVESTMENT", balance: -9_000 }),
        account({ id: "off", type: "CREDIT_DEBIT", balance: -1_000, isActive: false }),
        account({ id: "ok", type: "CREDIT_DEBIT", balance: 100 }),
      ],
    });

    expect(items).toEqual([expect.objectContaining({ kind: "NEGATIVE_BALANCE", accountId: "cc", amount: -4_500 })]);
  });

  it("inclui fatura que vence em até 7 dias e ignora as mais distantes", () => {
    const items = buildAccountAttention({
      asOf,
      accounts: [account({ id: "a", type: "CREDIT_CARD" }), account({ id: "b", type: "CREDIT_CARD" })],
      cardStatuses: new Map([
        ["a", status({ nextStatement: statement("a", 24) })],
        ["b", status({ nextStatement: statement("b", 30) })],
      ]),
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "CARD_DUE_SOON", accountId: "a", daysUntilDue: 2, amount: 124_000 });
  });

  it("fatura vencida vem antes de tudo, com dias negativos", () => {
    const items = buildAccountAttention({
      asOf,
      accounts: [account({ id: "neg", type: "CREDIT_DEBIT", balance: -1 }), account({ id: "a", type: "CREDIT_CARD" })],
      cardStatuses: new Map([["a", status({ overdueStatements: [statement("a", 20)] })]]),
    });

    expect(items.map((item) => item.kind)).toEqual(["CARD_OVERDUE", "NEGATIVE_BALANCE"]);
    expect(items[0].daysUntilDue).toBe(-2);
  });

  it("marca cartão perto do limite a partir de 90%", () => {
    const base = { asOf, accounts: [account({ id: "a", type: "CREDIT_CARD", creditLimit: 100_000 })] };

    expect(buildAccountAttention({ ...base, cardStatuses: new Map([["a", status({ usedLimit: 89_999 })]]) })).toEqual([]);
    const items = buildAccountAttention({ ...base, cardStatuses: new Map([["a", status({ usedLimit: 90_000 })]]) });
    expect(items[0]).toMatchObject({ kind: "CARD_NEAR_LIMIT", limitUsedPercent: 90, amount: 90_000 });
  });

  it("não usa limite quando o cartão não tem limite configurado", () => {
    const items = buildAccountAttention({
      asOf,
      accounts: [account({ id: "a", type: "CREDIT_CARD", creditLimit: null })],
      cardStatuses: new Map([["a", status({ usedLimit: 5_000_000 })]]),
    });

    expect(items).toEqual([]);
  });

  it("ignora fatura sem valor e cartão inativo", () => {
    const items = buildAccountAttention({
      asOf,
      accounts: [account({ id: "a", type: "CREDIT_CARD" }), account({ id: "b", type: "CREDIT_CARD", isActive: false })],
      cardStatuses: new Map([
        ["a", status({ nextStatement: statement("a", 23, 0) })],
        ["b", status({ nextStatement: statement("b", 23) })],
      ]),
    });

    expect(items).toEqual([]);
  });

  it("coloca vencimento em até 3 dias antes de saldo negativo e o de 4 a 7 dias depois do cartão no limite", () => {
    const items = buildAccountAttention({
      asOf,
      accounts: [
        account({ id: "soon", type: "CREDIT_CARD", creditLimit: 100_000 }),
        account({ id: "later", type: "CREDIT_CARD" }),
        account({ id: "neg", type: "CREDIT_DEBIT", balance: -50 }),
        account({ id: "full", type: "CREDIT_CARD", creditLimit: 100_000 }),
      ],
      cardStatuses: new Map([
        ["soon", status({ nextStatement: statement("soon", 24), usedLimit: 0 })],
        ["later", status({ nextStatement: statement("later", 28), usedLimit: 0 })],
        ["full", status({ usedLimit: 95_000 })],
      ]),
    });

    expect(items.map((item) => `${item.kind}:${item.accountId}`)).toEqual([
      "CARD_DUE_SOON:soon",
      "NEGATIVE_BALANCE:neg",
      "CARD_NEAR_LIMIT:full",
      "CARD_DUE_SOON:later",
    ]);
  });

  it("limita o total de itens", () => {
    const accounts = Array.from({ length: 8 }, (_, index) => account({ id: `n${index}`, type: "CREDIT_DEBIT", balance: -1 }));

    expect(buildAccountAttention({ asOf, accounts, cardStatuses: new Map() })).toHaveLength(MAX_ACCOUNT_ATTENTION_ITEMS);
  });
});
