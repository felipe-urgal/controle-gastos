import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/app/lib/currency/format-currency";
import {
  budgetNotifications,
  forecastNotifications,
  type BudgetNotificationInput,
} from "@/app/lib/notifications/notification-rules";

const asOf = { year: 2026, month: 11, day: 10 };

function budget(overrides: Partial<BudgetNotificationInput> = {}): BudgetNotificationInput {
  return {
    categoryId: "cat1",
    categoryName: "Mercado",
    currency: "BRL",
    limitAmount: 100_000,
    consumption: 85_000,
    planningPercentage: 85,
    ...overrides,
  };
}

describe("budgetNotifications", () => {
  it("avisa a partir de 80%, como atenção", () => {
    const [item] = budgetNotifications({ items: [budget()], asOf, showValues: true });
    expect(item).toMatchObject({ type: "BUDGET_LIMIT", severity: "WARNING", href: "/categorias/show/cat1" });
    expect(item.dedupeKey).toBe("BUDGET_LIMIT:cat1:20261101:P80");
    expect(item.body).toContain(formatCurrency(85_000, "BRL"));
    expect(item.body).toContain("85%");
  });

  it("não avisa abaixo de 80%", () => {
    expect(budgetNotifications({ items: [budget({ planningPercentage: 79.9 })], asOf, showValues: true })).toEqual([]);
  });

  it("acima de 100% só o aviso de 100%, urgente, e a chave não muda ao longo do mês", () => {
    const early = budgetNotifications({ items: [budget({ planningPercentage: 120 })], asOf, showValues: true });
    const late = budgetNotifications({
      items: [budget({ planningPercentage: 150 })],
      asOf: { year: 2026, month: 11, day: 28 },
      showValues: true,
    });
    expect(early).toHaveLength(1);
    expect(early[0]).toMatchObject({ severity: "URGENT" });
    expect(early[0].dedupeKey.endsWith(":P100")).toBe(true);
    expect(late[0].dedupeKey).toBe(early[0].dedupeKey);
  });

  it("limite zero com gasto conta como estourado", () => {
    const [item] = budgetNotifications({
      items: [budget({ limitAmount: 0, planningPercentage: null, consumption: 500 })],
      asOf,
      showValues: false,
    });
    expect(item.dedupeKey.endsWith(":P100")).toBe(true);
  });

  it("meses diferentes geram chaves diferentes e sem valores o texto fica só com a porcentagem", () => {
    const november = budgetNotifications({ items: [budget()], asOf, showValues: false })[0];
    const december = budgetNotifications({
      items: [budget()],
      asOf: { year: 2026, month: 12, day: 3 },
      showValues: false,
    })[0];
    expect(november.dedupeKey).not.toBe(december.dedupeKey);
    expect(november.body).not.toContain("R$");
    expect(november.body).toContain("85%");
  });
});

describe("forecastNotifications", () => {
  const account = (overrides = {}) => ({
    id: "acc1",
    name: "Conta corrente",
    currency: "BRL" as const,
    lowestProjectedBalance: -20_000,
    lowestProjectedBalanceDate: { year: 2026, month: 11, day: 25 },
    ...overrides,
  });

  it("avisa quando o saldo previsto cruza zero", () => {
    const [item] = forecastNotifications({ accounts: [account()], asOf, showValues: true });
    expect(item).toMatchObject({ type: "FORECAST_NEGATIVE", severity: "WARNING", href: "/contas/show/acc1" });
    expect(item.body).toContain("25/11/2026");
    expect(item.body).toContain(formatCurrency(-20_000, "BRL"));
  });

  it("não avisa com saldo mínimo zero ou positivo", () => {
    expect(forecastNotifications({ accounts: [account({ lowestProjectedBalance: 0 })], asOf, showValues: true })).toEqual([]);
    expect(forecastNotifications({ accounts: [account({ lowestProjectedBalance: 5_000 })], asOf, showValues: true })).toEqual([]);
  });

  it("fica urgente quando o ponto negativo está a 7 dias ou menos", () => {
    const [item] = forecastNotifications({
      accounts: [account({ lowestProjectedBalanceDate: { year: 2026, month: 11, day: 17 } })],
      asOf,
      showValues: true,
    });
    expect(item.severity).toBe("URGENT");
  });

  it("o dia do mínimo mudar dentro do mês não muda a chave", () => {
    const first = forecastNotifications({ accounts: [account()], asOf, showValues: true })[0];
    const moved = forecastNotifications({
      accounts: [account({ lowestProjectedBalanceDate: { year: 2026, month: 11, day: 28 } })],
      asOf,
      showValues: true,
    })[0];
    expect(moved.dedupeKey).toBe(first.dedupeKey);
  });

  it("sem valores ocultos o texto não traz o número", () => {
    const [item] = forecastNotifications({ accounts: [account()], asOf, showValues: false });
    expect(item.body).not.toContain("R$");
  });
});
