import { describe, expect, it } from "vitest";

import {
  buildQuickEntryPayload,
  categoriesForType,
  matchAccountByHint,
  pickInitialAccount,
  quickEntryStatus,
} from "@/app/lib/transactions/quick-entry-flow";

const today = { year: 2026, month: 11, day: 4 };
const accounts = [
  { id: "a1", name: "Itaú", isActive: true },
  { id: "a2", name: "Nubank", isActive: true },
  { id: "a3", name: "Nubank Empresas", isActive: true },
  { id: "a4", name: "Bradesco", isActive: false },
];

describe("matchAccountByHint", () => {
  it("casa sem diferenciar acento, caixa e espaços", () => {
    expect(matchAccountByHint("itau", accounts)?.id).toBe("a1");
    expect(matchAccountByHint("  ITAÚ ", accounts)?.id).toBe("a1");
  });

  it("nome exato vence candidatas parciais", () => {
    expect(matchAccountByHint("nubank", accounts)?.id).toBe("a2");
  });

  it("a dica pode ser maior que o nome ('nubank roxinho')", () => {
    expect(matchAccountByHint("itaú personnalité", accounts)?.id).toBe("a1");
  });

  it("na dúvida não escolhe: várias candidatas, nenhuma ou dica curta demais", () => {
    expect(matchAccountByHint("nu", accounts)).toBeNull();
    expect(matchAccountByHint("empresas", accounts)?.id).toBe("a3");
    expect(matchAccountByHint("santander", accounts)).toBeNull();
    expect(matchAccountByHint("a", accounts)).toBeNull();
    expect(matchAccountByHint(null, accounts)).toBeNull();
  });

  it("nunca escolhe conta inativa", () => {
    expect(matchAccountByHint("bradesco", accounts)).toBeNull();
  });

  it("duas contas com o mesmo nome exato é ambíguo", () => {
    const twins = [
      { id: "x1", name: "Carteira", isActive: true },
      { id: "x2", name: "carteira", isActive: true },
    ];
    expect(matchAccountByHint("carteira", twins)).toBeNull();
  });
});

describe("pickInitialAccount", () => {
  it("prefere a conta da frase, depois a sugerida, depois a única conta ativa", () => {
    expect(pickInitialAccount({ hint: "itaú", accounts, suggestedAccountId: "a2" })).toBe("a1");
    expect(pickInitialAccount({ hint: null, accounts, suggestedAccountId: "a2" })).toBe("a2");
    expect(pickInitialAccount({ hint: null, accounts: [accounts[0]], suggestedAccountId: null })).toBe("a1");
  });

  it("ignora sugestão de conta inativa ou inexistente e deixa vazio quando há mais de uma opção", () => {
    expect(pickInitialAccount({ hint: null, accounts, suggestedAccountId: "a4" })).toBeNull();
    expect(pickInitialAccount({ hint: null, accounts, suggestedAccountId: "zzz" })).toBeNull();
  });
});

describe("categoriesForType", () => {
  it("só ativas do tipo pedido, em ordem alfabética", () => {
    const categories = [
      { id: "1", name: "Mercado", type: "EXPENSE", isActive: true },
      { id: "2", name: "Água", type: "EXPENSE", isActive: true },
      { id: "3", name: "Salário", type: "INCOME", isActive: true },
      { id: "4", name: "Velha", type: "EXPENSE", isActive: false },
    ];
    expect(categoriesForType(categories, "EXPENSE").map((item) => item.id)).toEqual(["2", "1"]);
    expect(categoriesForType(categories, "INCOME").map((item) => item.id)).toEqual(["3"]);
  });
});

describe("quickEntryStatus", () => {
  it("hoje e passado são concluídos; futuro é pendente", () => {
    expect(quickEntryStatus({ year: 2026, month: 11, day: 3 }, today)).toBe("COMPLETED");
    expect(quickEntryStatus(today, today)).toBe("COMPLETED");
    expect(quickEntryStatus({ year: 2026, month: 11, day: 5 }, today)).toBe("PENDING");
    expect(quickEntryStatus({ year: 2027, month: 1, day: 1 }, today)).toBe("PENDING");
  });
});

describe("buildQuickEntryPayload", () => {
  const expenseCategory = { id: "c1", name: "Mercado", type: "EXPENSE", isActive: true };
  const base = {
    amountCents: 4_590,
    date: today,
    today,
    description: "  mercado ",
    accountId: "a1",
    category: expenseCategory,
    merchantId: null,
  };

  it("monta o corpo igual ao do formulário, com o tipo da categoria", () => {
    expect(buildQuickEntryPayload(base)).toEqual({
      ok: true,
      payload: {
        amount: 4_590,
        year: 2026,
        month: 11,
        day: 4,
        description: "mercado",
        status: "COMPLETED",
        accountId: "a1",
        categoryId: "c1",
        merchantId: null,
        allocations: [],
        tagIds: [],
        type: "EXPENSE",
      },
    });
  });

  it("data futura sai como pendente; categoria de receita vira receita", () => {
    const result = buildQuickEntryPayload({
      ...base,
      date: { year: 2026, month: 11, day: 20 },
      category: { id: "c2", name: "Salário", type: "INCOME", isActive: true },
      merchantId: "m1",
    });
    expect(result).toMatchObject({ ok: true, payload: { status: "PENDING", type: "INCOME", merchantId: "m1" } });
  });

  it.each([
    [{ amountCents: 0 }, "Valor inválido"],
    [{ amountCents: 1.5 }, "Valor inválido"],
    [{ amountCents: 1_000_000_001 }, "Valor inválido"],
    [{ description: " a " }, "Informe uma descrição"],
    [{ description: "x".repeat(101) }, "A descrição pode ter até 100 caracteres"],
    [{ accountId: null }, "Escolha a conta"],
    [{ category: null }, "Escolha a categoria"],
  ])("recusa %j", (override, message) => {
    expect(buildQuickEntryPayload({ ...base, ...override })).toEqual({ ok: false, message });
  });
});
