import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/app/lib/currency/format-currency";
import { commitmentNotifications } from "@/app/lib/notifications/notification-rules";
import type { FinancialCommitment } from "@/app/types/financial-commitment";

const asOf = { year: 2026, month: 11, day: 10 };

function commitment(overrides: Partial<FinancialCommitment> = {}): FinancialCommitment {
  return {
    id: "transaction:t1",
    type: "PENDING",
    direction: "PAYABLE",
    state: "UPCOMING",
    title: "Aluguel",
    amount: 150_000,
    currency: "BRL",
    date: { year: 2026, month: 11, day: 11 },
    href: "/transacoes/show/t1",
    accountName: "Conta",
    source: { kind: "TRANSACTION", id: "t1" },
    ...overrides,
  };
}

function card(day: number, overrides: Partial<FinancialCommitment> = {}) {
  return commitment({
    id: "card:c1:2026-10",
    type: "CARD_STATEMENT",
    title: "Fatura · Nubank",
    date: { year: 2026, month: 11, day },
    href: "/contas/show/c1",
    source: { kind: "CARD", id: "c1" },
    ...overrides,
  });
}

function run(commitments: FinancialCommitment[], showValues = true) {
  return commitmentNotifications({ commitments, asOf, showValues });
}

describe("commitmentNotifications", () => {
  describe("contas a pagar", () => {
    it("avisa quando vence amanhã e hoje, com severidade de atenção", () => {
      const [tomorrow] = run([commitment()]);
      expect(tomorrow).toMatchObject({
        type: "COMMITMENT_DUE",
        severity: "WARNING",
        title: "Aluguel",
        href: "/transacoes/show/t1",
      });
      expect(tomorrow.body).toContain("vence amanhã");
      expect(tomorrow.body).toContain(formatCurrency(150_000, "BRL"));

      const [today] = run([commitment({ date: asOf })]);
      expect(today.body).toContain("vence hoje");
    });

    it("não avisa antes da janela", () => {
      expect(run([commitment({ date: { year: 2026, month: 11, day: 12 } })])).toEqual([]);
    });

    it("avisa atraso uma vez e ignora atraso antigo", () => {
      const [late] = run([commitment({ state: "OVERDUE", date: { year: 2026, month: 11, day: 9 } })]);
      expect(late).toMatchObject({ severity: "URGENT" });
      expect(late.body).toContain("há 1 dia");

      expect(run([commitment({ state: "OVERDUE", date: { year: 2026, month: 11, day: 3 } })])).toHaveLength(1);
      expect(run([commitment({ state: "OVERDUE", date: { year: 2026, month: 11, day: 2 } })])).toEqual([]);
    });

    it("parcela de dívida: mesmo id com vencimentos diferentes tem chaves diferentes", () => {
      const debt = (date: { year: number; month: number; day: number }) =>
        commitment({ id: "debt:d1", type: "DEBT_INSTALLMENT", title: "Parcela · Financiamento", date });
      const november = commitmentNotifications({
        commitments: [debt({ year: 2026, month: 11, day: 11 })],
        asOf,
        showValues: true,
      });
      const december = commitmentNotifications({
        commitments: [debt({ year: 2026, month: 12, day: 11 })],
        asOf: { year: 2026, month: 12, day: 10 },
        showValues: true,
      });

      expect(november).toHaveLength(1);
      expect(december).toHaveLength(1);
      expect(november[0].dedupeKey).not.toBe(december[0].dedupeKey);
    });
  });

  describe("faturas de cartão", () => {
    it("avisa em D3 (2 ou 3 dias), depois em DUE (hoje ou amanhã), com chaves distintas", () => {
      const d3 = run([card(13)])[0];
      const due = run([card(11)])[0];
      expect(d3).toMatchObject({ type: "CARD_STATEMENT_DUE", severity: "INFO" });
      expect(due).toMatchObject({ type: "CARD_STATEMENT_DUE", severity: "WARNING" });
      expect(d3.dedupeKey).not.toBe(due.dedupeKey);
      expect(d3.dedupeKey.endsWith(":D3")).toBe(true);
      expect(due.dedupeKey.endsWith(":DUE")).toBe(true);
    });

    it("dia sem cron (faltam 2 dias) ainda gera o aviso D3", () => {
      expect(run([card(12)])).toHaveLength(1);
    });

    it("não avisa com mais de 3 dias e avisa fatura vencida", () => {
      expect(run([card(14)])).toEqual([]);
      const [overdue] = run([card(8, { state: "OVERDUE" })]);
      expect(overdue).toMatchObject({ severity: "URGENT" });
      expect(overdue.body).toContain("há 2 dias");
    });

    it("a mesma fatura gera a mesma chave em dias seguidos do mesmo estágio", () => {
      const first = run([card(11)])[0];
      const again = commitmentNotifications({
        commitments: [card(11)],
        asOf: { year: 2026, month: 11, day: 11 },
        showValues: true,
      })[0];
      expect(again.dedupeKey).toBe(first.dedupeKey);
    });
  });

  describe("receitas esperadas", () => {
    const income = (day: number) =>
      commitment({
        id: "transaction:i1",
        direction: "RECEIVABLE",
        state: "OVERDUE",
        title: "Salário",
        date: { year: 2026, month: 11, day },
      });

    it("só avisa depois de 3 dias de atraso e até 7", () => {
      expect(run([income(8)])).toEqual([]);
      const [late] = run([income(7)]);
      expect(late).toMatchObject({ type: "INCOME_OVERDUE", severity: "INFO" });
      expect(run([income(2)])).toEqual([]);
    });

    it("receita futura nunca avisa", () => {
      expect(run([commitment({ direction: "RECEIVABLE", date: { year: 2026, month: 11, day: 11 } })])).toEqual([]);
    });
  });

  describe("privacidade e limites", () => {
    it("com valores ocultos, o texto não traz número", () => {
      const [item] = run([commitment()], false);
      expect(item.body).not.toMatch(/\d{2,}\.\d{3}|R\$/);
      expect(item.body).toContain("vence amanhã");
    });

    it("valor desconhecido não vira zero", () => {
      const [item] = run([commitment({ amount: null })]);
      expect(item.body).not.toContain("R$");
    });

    it("marcos (metas) não geram aviso aqui", () => {
      expect(run([commitment({ direction: "MILESTONE", type: "GOAL_DEADLINE" })])).toEqual([]);
    });

    it("moedas diferentes geram avisos separados com a própria moeda", () => {
      const items = run([
        commitment({ id: "transaction:a", currency: "BRL" }),
        commitment({ id: "transaction:b", currency: "USD", amount: 10_000 }),
      ]);
      expect(items).toHaveLength(2);
      expect(items[1].body).toContain(formatCurrency(10_000, "USD"));
    });

    it("título e corpo respeitam os limites das colunas", () => {
      const [item] = run([commitment({ title: "x".repeat(400) })]);
      expect(item.title.length).toBeLessThanOrEqual(120);
      expect(item.body.length).toBeLessThanOrEqual(300);
    });
  });
});
