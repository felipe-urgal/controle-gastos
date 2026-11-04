import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/app/lib/currency/format-money";
import { favoriteShortcuts } from "@/app/lib/templates/quick-favorites";
import type { TransactionTemplateDTO } from "@/app/types/transaction-template";

function template(overrides: Partial<TransactionTemplateDTO> = {}): TransactionTemplateDTO {
  return {
    id: "t1",
    name: "Academia",
    type: "EXPENSE",
    description: "Mensalidade",
    amount: 12_990,
    isFavorite: true,
    account: { id: "a1", name: "Itaú", currency: "BRL", isActive: true },
    category: { id: "c1", name: "Saúde", type: "EXPENSE", isActive: true },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("favoriteShortcuts", () => {
  it("aponta para a tela de nova transação com o modelo e mostra tipo e valor", () => {
    const [item] = favoriteShortcuts([template()], { showValues: true });

    expect(item).toMatchObject({ id: "t1", title: "Academia", href: "/transacoes/nova?template=t1" });
    expect(item.subtitle).toBe(`Despesa · ${formatCurrency(12_990, "BRL")} · modelo favorito`);
  });

  it("só favoritos, no máximo três, na ordem recebida", () => {
    const items = favoriteShortcuts(
      [
        template({ id: "a" }),
        template({ id: "b", isFavorite: false }),
        template({ id: "c" }),
        template({ id: "d" }),
        template({ id: "e" }),
      ],
      { showValues: true },
    );

    expect(items.map((item) => item.id)).toEqual(["a", "c", "d"]);
  });

  it("com valores ocultos o texto não traz o valor", () => {
    const [item] = favoriteShortcuts([template()], { showValues: false });

    expect(item.subtitle).toBe("Despesa · modelo favorito");
    expect(item.subtitle).not.toContain("R$");
  });

  it("modelo sem valor definido não vira zero, e receita e moeda da conta são respeitadas", () => {
    const [noAmount] = favoriteShortcuts([template({ amount: null })], { showValues: true });
    expect(noAmount.subtitle).toBe("Despesa · modelo favorito");

    const [income] = favoriteShortcuts(
      [template({ type: "INCOME", amount: 1_000, account: { id: "a2", name: "Wise", currency: "USD", isActive: true } })],
      { showValues: true },
    );
    expect(income.subtitle).toBe(`Receita · ${formatCurrency(1_000, "USD")} · modelo favorito`);
  });

  it("o id vai codificado na URL", () => {
    const [item] = favoriteShortcuts([template({ id: "x y&z=1" })], { showValues: true });
    expect(item.href).toBe("/transacoes/nova?template=x%20y%26z%3D1");
  });

  it("sem modelos devolve lista vazia", () => {
    expect(favoriteShortcuts([], { showValues: true })).toEqual([]);
  });
});
